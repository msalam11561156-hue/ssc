import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return eq ? eq.slice(flag.length + 1) : undefined;
}

const app = express();
const cliPort = getCliArg('--port');
const cliHost = getCliArg('--host');
const PORT = cliPort
  ? parseInt(cliPort, 10)
  : process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;
const HOST = cliHost || '0.0.0.0';

app.use(express.json());

const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, 'dist');

const isProdEnv = process.env.NODE_ENV === 'production';

if (isProdEnv) {
  // Explicit route for /sw.js in production (serving Workbox-generated dist/sw.js first)
  app.get(['/sw.js', '/dev-sw.js'], (_req, res) => {
    const swDistPath = path.join(distPath, 'sw.js');
    const swPublicPath = path.join(publicPath, 'sw.js');
    const target = fs.existsSync(swDistPath) ? swDistPath : swPublicPath;
    if (fs.existsSync(target)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(target);
    }
    return res.status(404).type('text/plain').send('Service Worker not found');
  });

  // Explicit route for /manifest.webmanifest in production
  app.get('/manifest.webmanifest', (_req, res) => {
    const mDistPath = path.join(distPath, 'manifest.webmanifest');
    const mPublicPath = path.join(publicPath, 'manifest.webmanifest');
    const target = fs.existsSync(mDistPath) ? mDistPath : mPublicPath;
    if (fs.existsSync(target)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(target);
    }
    return res.status(404).type('text/plain').send('Manifest not found');
  });
}

const staticAssetOptions = {
  setHeaders: (res: express.Response, filePath: string) => {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.jfif')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    if (lower.endsWith('sw.js') || lower.endsWith('manifest.webmanifest') || lower.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (lower.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
    }
  },
};

// Force image/jpeg MIME type for .jfif images in all routes
app.use((req, res, next) => {
  if (req.path.toLowerCase().endsWith('.jfif')) {
    const origSetHeader = res.setHeader.bind(res);
    res.setHeader = ((name: string, value: number | string | readonly string[]) => {
      if (name.toLowerCase() === 'content-type' && (!value || value === 'application/octet-stream')) {
        return origSetHeader(name, 'image/jpeg');
      }
      return origSetHeader(name, value);
    }) as typeof res.setHeader;
    res.setHeader('Content-Type', 'image/jpeg');
  }
  next();
});

// Serve static assets from public/
app.use(express.static(publicPath, staticAssetOptions));

const DATA_DIR = path.join(__dirname, '.data');
const TRIAL_FILE = path.join(DATA_DIR, 'trial_devices.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data dir:', e);
  }
}

interface DeviceRecord {
  hasStarted: boolean;
  isExpired: boolean;
  usedDays: string[];
  dailyUsage: Record<string, number>;
  totalUsageMs: number;
}

function loadDeviceTrials(): Record<string, DeviceRecord> {
  try {
    if (fs.existsSync(TRIAL_FILE)) {
      return JSON.parse(fs.readFileSync(TRIAL_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading trial devices:', err);
  }
  return {};
}

function saveDeviceTrials(data: Record<string, DeviceRecord>) {
  try {
    fs.writeFileSync(TRIAL_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving trial devices:', err);
  }
}

// حدود النسخة التجريبية: 4 ساعات على مدار 4 أيام (ساعة كل يوم)
const DAILY_TRIAL_MS = 60 * 60 * 1000; // 1 hour per day
const MAX_TRIAL_DAYS = 4; // 4 days max
const TOTAL_TRIAL_MS = MAX_TRIAL_DAYS * DAILY_TRIAL_MS; // 4 hours total

function getEgyptDateKeyServer(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

function getClientKeys(req: express.Request): { fullKey: string; fpKey: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
  const fp = (req.query.fp || req.body?.fp || '').toString().trim();
  const fullKey = fp ? `${ip}_${fp}` : `ip_${ip}`;
  const fpKey = fp ? `fp_${fp}` : '';
  return { fullKey, fpKey };
}

function evaluateRecord(record?: DeviceRecord, todayKeyOverride?: string) {
  const todayKey = todayKeyOverride || getEgyptDateKeyServer();

  if (!record || !record.hasStarted) {
    return {
      hasStarted: false,
      isExpired: false,
      isDayExpired: false,
      usedDays: [],
      dailyUsage: {},
      remainingDayMs: DAILY_TRIAL_MS,
      remainingTotalMs: TOTAL_TRIAL_MS,
      currentDayNumber: 1,
    };
  }

  const usedDays = Array.isArray(record.usedDays) ? record.usedDays : [];
  const dailyUsage = record.dailyUsage || {};
  let totalUsageMs = 0;
  for (const day of usedDays) {
    totalUsageMs += Number(dailyUsage[day]) || 0;
  }

  const isTodayIncluded = usedDays.includes(todayKey);
  const effectiveDayNumber = isTodayIncluded ? usedDays.indexOf(todayKey) + 1 : usedDays.length + 1;

  if (record.isExpired || totalUsageMs >= TOTAL_TRIAL_MS || (!isTodayIncluded && usedDays.length >= MAX_TRIAL_DAYS)) {
    return {
      hasStarted: true,
      isExpired: true,
      isDayExpired: true,
      usedDays,
      dailyUsage,
      remainingDayMs: 0,
      remainingTotalMs: 0,
      currentDayNumber: Math.min(MAX_TRIAL_DAYS, usedDays.length || 1),
    };
  }

  const todayConsumedMs = Number(dailyUsage[todayKey]) || 0;
  const remainingDayMs = Math.max(0, DAILY_TRIAL_MS - todayConsumedMs);
  const isDayExpired = remainingDayMs <= 0;

  if (effectiveDayNumber >= MAX_TRIAL_DAYS && isDayExpired) {
    return {
      hasStarted: true,
      isExpired: true,
      isDayExpired: true,
      usedDays,
      dailyUsage,
      remainingDayMs: 0,
      remainingTotalMs: 0,
      currentDayNumber: MAX_TRIAL_DAYS,
    };
  }

  return {
    hasStarted: true,
    isExpired: false,
    isDayExpired,
    usedDays,
    dailyUsage,
    remainingDayMs,
    remainingTotalMs: Math.max(0, TOTAL_TRIAL_MS - totalUsageMs),
    currentDayNumber: Math.min(MAX_TRIAL_DAYS, effectiveDayNumber),
  };
}

// مزامنة الوقت الفعلي من الخادم لمنع التلاعب بساعة الجهاز
app.get('/api/time', (_req, res) => {
  return res.json({ now: Date.now() });
});

// التحقق من حالة الحصة التجريبية للجهاز
app.get('/api/trial/status', (req, res) => {
  const { fullKey, fpKey } = getClientKeys(req);
  const todayKey = (req.query.todayKey || '').toString().trim() || getEgyptDateKeyServer();
  const trials = loadDeviceTrials();
  const record = (fpKey && trials[fpKey]) || trials[fullKey];

  const evaluated = evaluateRecord(record, todayKey);
  return res.json(evaluated);
});

// بدء أو استئناف النسخة التجريبية للجهاز
app.post('/api/trial/start', (req, res) => {
  const { fullKey, fpKey } = getClientKeys(req);
  const todayKey = (req.body?.todayKey || '').toString().trim() || getEgyptDateKeyServer();
  const trials = loadDeviceTrials();
  let record = (fpKey && trials[fpKey]) || trials[fullKey];

  if (!record) {
    record = {
      hasStarted: true,
      isExpired: false,
      usedDays: [todayKey],
      dailyUsage: { [todayKey]: 0 },
      totalUsageMs: 0,
    };
  } else {
    record.hasStarted = true;
    if (!record.usedDays) record.usedDays = [];
    if (!record.dailyUsage) record.dailyUsage = {};
    if (!record.usedDays.includes(todayKey)) {
      if (record.usedDays.length < MAX_TRIAL_DAYS) {
        record.usedDays.push(todayKey);
        if (record.dailyUsage[todayKey] === undefined) {
          record.dailyUsage[todayKey] = 0;
        }
      }
    }
  }

  trials[fullKey] = record;
  if (fpKey) trials[fpKey] = record;
  saveDeviceTrials(trials);

  return res.json(evaluateRecord(record, todayKey));
});

// استهلاك أو فحص الوقت على الخادم
app.post('/api/trial/consume', (req, res) => {
  const { fullKey, fpKey } = getClientKeys(req);
  const todayKey = (req.body?.todayKey || '').toString().trim() || getEgyptDateKeyServer();
  const deltaMs = Math.max(0, Math.min(60000, Number(req.body?.deltaMs) || 0));
  const trials = loadDeviceTrials();
  let record = (fpKey && trials[fpKey]) || trials[fullKey];

  if (record && !record.isExpired) {
    if (!record.usedDays) record.usedDays = [];
    if (!record.dailyUsage) record.dailyUsage = {};
    if (!record.usedDays.includes(todayKey) && record.usedDays.length < MAX_TRIAL_DAYS) {
      record.usedDays.push(todayKey);
    }
    const currentDayUsage = (record.dailyUsage[todayKey] || 0) + deltaMs;
    record.dailyUsage[todayKey] = currentDayUsage;

    let totalUsageMs = 0;
    for (const d of record.usedDays) {
      totalUsageMs += Number(record.dailyUsage[d]) || 0;
    }
    record.totalUsageMs = totalUsageMs;

    if (totalUsageMs >= TOTAL_TRIAL_MS || (record.usedDays.length >= MAX_TRIAL_DAYS && currentDayUsage >= DAILY_TRIAL_MS)) {
      record.isExpired = true;
    }

    trials[fullKey] = record;
    if (fpKey) trials[fpKey] = record;
    saveDeviceTrials(trials);
  }

  return res.json(evaluateRecord(record, todayKey));
});

// إنهاء الحصة التجريبية للجهاز
app.post('/api/trial/expire', (req, res) => {
  const { fullKey, fpKey } = getClientKeys(req);
  const trials = loadDeviceTrials();
  const record: DeviceRecord = {
    hasStarted: true,
    isExpired: true,
    usedDays: ['day1', 'day2', 'day3', 'day4'],
    dailyUsage: {},
    totalUsageMs: TOTAL_TRIAL_MS,
  };
  trials[fullKey] = record;
  if (fpKey) trials[fpKey] = record;
  saveDeviceTrials(trials);
  return res.json(evaluateRecord(record));
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    let viteInstance: Awaited<ReturnType<typeof import('vite')['createServer']>> | null = null;
    const viteInitPromise = (async () => {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
          watch: null,
        },
        appType: 'spa',
      });
      viteInstance = vite;
      return vite;
    })().catch((err) => {
      console.error('Vite initialization failed:', err);
      throw err;
    });

    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        req.path.startsWith('/assets/') &&
        req.path.match(/\.(js|mjs|css|json|webmanifest|png|jpg|jpeg|gif|svg|ico|wav|woff2?|webp|jfif)$/i)
      ) {
        return res.status(404).end();
      }
      return next();
    });

    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const vite = viteInstance || (await viteInitPromise);
        const result = await vite.transformRequest('/@vite/client');
        if (result && typeof result.code === 'string') {
          const patchedCode = result.code
            .replace(
              /\btransport\.connect\(createHMRHandler\(handleMessage\)\);?/g,
              '/* HMR WebSocket disabled */'
            )
            .replace(
              /throw new Error\((["'])send was called before connect\1\);?/g,
              'return;'
            )
            .replace(
              /throw new Error\((["'])invoke was called before connect\1\);?/g,
              'return;'
            );
          res.status(200).set({
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }).end(patchedCode);
          return;
        }
      } catch {
        // Fallback to vite.middlewares on error
      }
      return next();
    });

    app.use(async (req, res, next) => {
      try {
        const vite = viteInstance || (await viteInitPromise);
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      // Do not serve index.html for static asset requests (scripts, styles, images, audio, etc.)
      if (req.path.match(/\.(js|mjs|css|json|webmanifest|png|jpg|jpeg|gif|svg|ico|wav|woff2?|webp|jfif)$/i)) {
        return res.status(404).end();
      }
      try {
        const vite = viteInstance || (await viteInitPromise);
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, staticAssetOptions));
    app.get('*', (req, res) => {
      if (req.path.match(/\.(js|mjs|css|json|webmanifest|png|jpg|jpeg|gif|svg|ico|wav|woff2?|webp|jfif)$/i)) {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
