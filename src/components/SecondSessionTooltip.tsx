import React from 'react';
import { AlertTriangle, CheckCircle2, BookOpen, Layers } from 'lucide-react';

export interface SecondSessionTooltipData {
  text: string;
  subjectsTitle: string;
  lines?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  studentName?: string;
  seatNumber?: string;
  secretNumber?: string;
  stageLabel?: string;
  gradeLabel?: string;
  semesterLabel?: string;
  showName?: boolean;
  showSeatNumber?: boolean;
  showSecretNumber?: boolean;
}

interface SecondSessionTooltipProps {
  tooltip: SecondSessionTooltipData | null;
}

interface SubjectTheme {
  bg: string;
  border: string;
  badgeBg: string;
  accentColor: string;
  bulletBg: string;
  glow: string;
  iconColor: string;
}

const getSubjectTheme = (name: string, index: number): SubjectTheme => {
  const n = name.trim();
  if (n.includes('عرب')) {
    return {
      bg: 'bg-gradient-to-br from-rose-950/90 via-red-900/40 to-slate-900/90',
      border: 'border-rose-500/60 shadow-[0_4px_20px_rgba(244,63,94,0.18)]',
      badgeBg: 'bg-rose-500/25 text-rose-200 border-rose-400/50',
      accentColor: 'text-rose-400',
      bulletBg: 'bg-rose-400',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      iconColor: 'text-rose-400'
    };
  }
  if (n.includes('إنجليز') || n.includes('انجليز') || n.toLowerCase().includes('english')) {
    return {
      bg: 'bg-gradient-to-br from-blue-950/90 via-indigo-900/40 to-slate-900/90',
      border: 'border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.18)]',
      badgeBg: 'bg-blue-500/25 text-blue-200 border-blue-400/50',
      accentColor: 'text-blue-400',
      bulletBg: 'bg-blue-400',
      glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
      iconColor: 'text-blue-400'
    };
  }
  if (n.includes('رياض') || n.toLowerCase().includes('math')) {
    return {
      bg: 'bg-gradient-to-br from-purple-950/90 via-violet-900/40 to-slate-900/90',
      border: 'border-purple-500/60 shadow-[0_4px_20px_rgba(168,85,247,0.18)]',
      badgeBg: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
      accentColor: 'text-purple-400',
      bulletBg: 'bg-purple-400',
      glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
      iconColor: 'text-purple-400'
    };
  }
  if (n.includes('علوم') || n.toLowerCase().includes('science')) {
    return {
      bg: 'bg-gradient-to-br from-emerald-950/90 via-teal-900/40 to-slate-900/90',
      border: 'border-emerald-500/60 shadow-[0_4px_20px_rgba(16,185,129,0.18)]',
      badgeBg: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
      accentColor: 'text-emerald-400',
      bulletBg: 'bg-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
      iconColor: 'text-emerald-400'
    };
  }
  if (n.includes('دراس') || n.includes('اجتماع')) {
    return {
      bg: 'bg-gradient-to-br from-amber-950/90 via-yellow-900/40 to-slate-900/90',
      border: 'border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.18)]',
      badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
      accentColor: 'text-amber-400',
      bulletBg: 'bg-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      iconColor: 'text-amber-400'
    };
  }
  if (n.includes('دين') || n.includes('إسلام') || n.includes('مسيح')) {
    return {
      bg: 'bg-gradient-to-br from-teal-950/90 via-cyan-900/40 to-slate-900/90',
      border: 'border-teal-500/60 shadow-[0_4px_20px_rgba(20,184,166,0.18)]',
      badgeBg: 'bg-teal-500/25 text-teal-200 border-teal-400/50',
      accentColor: 'text-teal-400',
      bulletBg: 'bg-teal-400',
      glow: 'shadow-[0_0_12px_rgba(20,184,166,0.3)]',
      iconColor: 'text-teal-400'
    };
  }
  if (n.includes('فني') || n.includes('رسم')) {
    return {
      bg: 'bg-gradient-to-br from-fuchsia-950/90 via-pink-900/40 to-slate-900/90',
      border: 'border-fuchsia-500/60 shadow-[0_4px_20px_rgba(217,70,239,0.18)]',
      badgeBg: 'bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-400/50',
      accentColor: 'text-fuchsia-400',
      bulletBg: 'bg-fuchsia-400',
      glow: 'shadow-[0_0_12px_rgba(217,70,239,0.3)]',
      iconColor: 'text-fuchsia-400'
    };
  }
  if (n.includes('تكنولوج') || n.includes('حاسب') || n.toLowerCase().includes('ict')) {
    return {
      bg: 'bg-gradient-to-br from-cyan-950/90 via-sky-900/40 to-slate-900/90',
      border: 'border-cyan-500/60 shadow-[0_4px_20px_rgba(6,182,212,0.18)]',
      badgeBg: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50',
      accentColor: 'text-cyan-400',
      bulletBg: 'bg-cyan-400',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.3)]',
      iconColor: 'text-cyan-400'
    };
  }
  if (n.includes('رياضي') || n.includes('بدني')) {
    return {
      bg: 'bg-gradient-to-br from-orange-950/90 via-amber-900/40 to-slate-900/90',
      border: 'border-orange-500/60 shadow-[0_4px_20px_rgba(249,115,22,0.18)]',
      badgeBg: 'bg-orange-500/25 text-orange-200 border-orange-400/50',
      accentColor: 'text-orange-400',
      bulletBg: 'bg-orange-400',
      glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
      iconColor: 'text-orange-400'
    };
  }
  if (n.includes('موسيق')) {
    return {
      bg: 'bg-gradient-to-br from-pink-950/90 via-rose-900/40 to-slate-900/90',
      border: 'border-pink-500/60 shadow-[0_4px_20px_rgba(236,72,153,0.18)]',
      badgeBg: 'bg-pink-500/25 text-pink-200 border-pink-400/50',
      accentColor: 'text-pink-400',
      bulletBg: 'bg-pink-400',
      glow: 'shadow-[0_0_12px_rgba(236,72,153,0.3)]',
      iconColor: 'text-pink-400'
    };
  }
  if (n.includes('مجال') || n.includes('توكاتسو')) {
    return {
      bg: 'bg-gradient-to-br from-lime-950/90 via-emerald-900/40 to-slate-900/90',
      border: 'border-lime-500/60 shadow-[0_4px_20px_rgba(132,204,22,0.18)]',
      badgeBg: 'bg-lime-500/25 text-lime-200 border-lime-400/50',
      accentColor: 'text-lime-400',
      bulletBg: 'bg-lime-400',
      glow: 'shadow-[0_0_12px_rgba(132,204,22,0.3)]',
      iconColor: 'text-lime-400'
    };
  }

  // Fallback palette by index
  const fallbackList: SubjectTheme[] = [
    {
      bg: 'bg-gradient-to-br from-red-950/90 via-rose-900/40 to-slate-900/90',
      border: 'border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.18)]',
      badgeBg: 'bg-red-500/25 text-red-200 border-red-400/50',
      accentColor: 'text-red-400',
      bulletBg: 'bg-red-400',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]',
      iconColor: 'text-red-400'
    },
    {
      bg: 'bg-gradient-to-br from-indigo-950/90 via-blue-900/40 to-slate-900/90',
      border: 'border-indigo-500/60 shadow-[0_4px_20px_rgba(99,102,241,0.18)]',
      badgeBg: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50',
      accentColor: 'text-indigo-400',
      bulletBg: 'bg-indigo-400',
      glow: 'shadow-[0_0_12px_rgba(99,102,241,0.3)]',
      iconColor: 'text-indigo-400'
    },
    {
      bg: 'bg-gradient-to-br from-teal-950/90 via-emerald-900/40 to-slate-900/90',
      border: 'border-teal-500/60 shadow-[0_4px_20px_rgba(20,184,166,0.18)]',
      badgeBg: 'bg-teal-500/25 text-teal-200 border-teal-400/50',
      accentColor: 'text-teal-400',
      bulletBg: 'bg-teal-400',
      glow: 'shadow-[0_0_12px_rgba(20,184,166,0.3)]',
      iconColor: 'text-teal-400'
    },
    {
      bg: 'bg-gradient-to-br from-amber-950/90 via-yellow-900/40 to-slate-900/90',
      border: 'border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.18)]',
      badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
      accentColor: 'text-amber-400',
      bulletBg: 'bg-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      iconColor: 'text-amber-400'
    }
  ];

  return fallbackList[index % fallbackList.length];
};

export const SecondSessionTooltip: React.FC<SecondSessionTooltipProps> = ({ tooltip }) => {
  if (!tooltip || (!tooltip.text && !tooltip.subjectsTitle)) return null;

  const rawLines = tooltip.lines && tooltip.lines.length > 0
    ? tooltip.lines
    : (tooltip.text ? tooltip.text.split('\n') : []);

  const hasFailingSubjects = rawLines.some(l => l.includes(' : ') || l.startsWith('مادة '));

  // 100% expanded tooltip width (previously 390px, now 780px)
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const tooltipWidth = Math.min(780, screenWidth - 24);

  // Smart horizontal positioning
  let left = tooltip.x - tooltipWidth - 14;
  if (left < 12) {
    if (tooltip.x + tooltip.width + tooltipWidth + 14 <= screenWidth) {
      left = tooltip.x + tooltip.width + 14;
    } else {
      left = Math.max(12, (screenWidth - tooltipWidth) / 2);
    }
  }
  left = Math.max(12, Math.min(screenWidth - tooltipWidth - 12, left));

  // Smart vertical positioning
  let top = tooltip.y - 12;
  const estimatedHeight = Math.min(480, screenHeight - 60);
  if (top + estimatedHeight > screenHeight - 12) {
    top = Math.max(12, screenHeight - estimatedHeight - 12);
  }
  top = Math.max(12, top);

  return (
    <div 
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      dir="rtl"
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="relative rounded-2xl p-[3px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(234,179,8,0.3)]">
        {/* Animated glowing border */}
        <div className="absolute inset-[-150%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#ca8a04_0%,#fbbf24_20%,#fef08a_35%,#ca8a04_50%,#fbbf24_70%,#fef08a_85%,#ca8a04_100%)] pointer-events-none" />

        <div className="relative bg-slate-950/95 backdrop-blur-2xl text-white rounded-[14px] p-4 sm:p-5 text-right leading-relaxed max-h-[84vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-amber-400/30 pb-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                {hasFailingSubjects ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-base sm:text-lg">
                    {hasFailingSubjects 
                      ? (tooltip?.stageLabel?.includes('رياض') ? 'مواد برامج علاجية للطالب' : 'مواد الدور الثاني للطالب')
                      : 'نتيجة الطالب'}
                  </span>
                  {hasFailingSubjects && (
                    <span className="bg-red-500/20 border border-red-500/50 text-red-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm">
                      {rawLines.length} {rawLines.length === 1 ? 'مادة' : 'مواد'}
                    </span>
                  )}
                </div>
                {(() => {
                  const isNameAllowed = tooltip.showName ?? true;
                  const isSeatNumberAllowed = tooltip.showSeatNumber ?? true;
                  const isSecretNumberAllowed = tooltip.showSecretNumber ?? true;
                  const parts: string[] = [];
                  if (tooltip.stageLabel) parts.push(tooltip.stageLabel);
                  if (tooltip.gradeLabel) parts.push(tooltip.gradeLabel);
                  if (tooltip.semesterLabel) parts.push(tooltip.semesterLabel);
                  if (isNameAllowed && tooltip.studentName) {
                    parts.push(tooltip.studentName);
                  }
                  if (isSeatNumberAllowed && tooltip.seatNumber) {
                    parts.push(tooltip.seatNumber);
                  }
                  if (isSecretNumberAllowed && tooltip.secretNumber) {
                    parts.push(tooltip.secretNumber);
                  }
                  if (parts.length === 0) return null;
                  return (
                    <span className="text-white text-xs sm:text-sm font-bold mt-1 text-center">
                      {parts.join(' - ')}
                    </span>
                  );
                })()}
                {tooltip.subjectsTitle && (
                  <span className="text-amber-300 text-xs sm:text-sm font-bold mt-0.5">
                    {tooltip.subjectsTitle}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-bold text-slate-300">
              تلميح تفصيلي للدور الثاني
            </div>
          </div>

          {/* Cards Grid */}
          {hasFailingSubjects ? (
            <div className={`grid gap-3.5 ${rawLines.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {rawLines.map((line, idx) => {
                const isStructured = line.includes(' : ');
                const parts = isStructured ? line.split(' : ') : [line];
                const subjectRaw = parts[0].trim();
                const subjectName = isStructured ? subjectRaw.replace(/^مادة\s+/, '').trim() : '';
                const detailsRaw = isStructured ? parts.slice(1).join(' : ').trim() : line;
                const reasons = detailsRaw ? detailsRaw.split(/\s*(?:،|-)\s*/).map(r => r.trim()).filter(Boolean) : [];
                const theme = getSubjectTheme(subjectName || line, idx);

                return (
                  <div 
                    key={idx}
                    className={`relative rounded-xl border-2 p-3.5 flex flex-col justify-between gap-3 transition-all duration-200 ${theme.bg} ${theme.border} ${theme.glow}`}
                  >
                    {/* Card Top Title */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${theme.bulletBg} ring-4 ring-white/10 shrink-0`} />
                        <h4 className="font-black text-base sm:text-lg text-white leading-tight">
                          {subjectName ? `مادة ${subjectName}` : line}
                        </h4>
                      </div>
                      {subjectName && (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-sm ${theme.badgeBg}`}>
                          {tooltip?.stageLabel?.includes('رياض') ? 'برامج علاجية' : 'دور ثان'}
                        </span>
                      )}
                    </div>

                    {/* Reasons List */}
                    {reasons.length > 0 ? (
                      <div className="flex flex-col gap-2 pt-0.5 text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                        {reasons.map((reason, rIdx) => (
                          <div 
                            key={rIdx} 
                            className="flex items-start gap-2 bg-black/40 rounded-lg p-2.5 border border-white/10 shadow-inner"
                          >
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${theme.bulletBg} shrink-0`} />
                            <span className="flex-1 font-semibold text-slate-100">{reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-300 text-xs sm:text-sm font-semibold p-2 bg-black/30 rounded-lg border border-white/5">
                        {line}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-950/90 via-teal-900/40 to-slate-900/90 border-2 border-emerald-500/60 rounded-xl p-4 flex items-center gap-3.5 shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-emerald-300 font-black text-base sm:text-lg">
                  ناجح لاجتيازه جميع المواد بنجاح
                </span>
                <span className="text-slate-200 text-xs sm:text-sm font-bold mt-1">
                  {tooltip.text || 'حقق الطالب شروط النجاح المقررة ولم يرسب فى أى مادة.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
