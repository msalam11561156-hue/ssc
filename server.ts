import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

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
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
