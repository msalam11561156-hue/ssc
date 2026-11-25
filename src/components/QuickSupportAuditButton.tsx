import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface QuickSupportAuditButtonProps {
  issueCount: number;
  onClick: () => void;
  className?: string;
}

export const QuickSupportAuditButton: React.FC<QuickSupportAuditButtonProps> = ({
  issueCount,
  onClick,
  className = '',
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; centerX: number; arrowOffset: number } | null>(null);

  const hasIssues = issueCount > 0;

  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedHalfWidth = Math.min(245, (window.innerWidth - 24) / 2);
    const margin = 12;
    const rawCenterX = rect.left + rect.width / 2;
    const clampedCenterX = Math.max(
      estimatedHalfWidth + margin,
      Math.min(window.innerWidth - estimatedHalfWidth - margin, rawCenterX)
    );
    const maxArrowOffset = Math.max(0, estimatedHalfWidth - 24);
    const arrowOffset = Math.max(
      -maxArrowOffset,
      Math.min(maxArrowOffset, rawCenterX - clampedCenterX)
    );

    setCoords({
      top: rect.bottom + 12,
      centerX: clampedCenterX,
      arrowOffset,
    });
  }, []);

  useEffect(() => {
    if (!isHovered) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    const handleScroll = () => setIsHovered(false);

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isHovered, updatePosition]);

  const tooltipStatusText = hasIssues
    ? `( ${issueCount} ملاحظة )`
    : '( مكتمل )';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsHovered(false);
          onClick();
        }}
        onMouseEnter={() => {
          updatePosition();
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => {
          updatePosition();
          setIsHovered(true);
        }}
        onBlur={() => setIsHovered(false)}
        aria-label={`الدعم السريع - فحص الأخطاء قبل الطباعة ${tooltipStatusText}`}
        className={`${className} flex items-center justify-center w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full border-2 border-slate-900 shadow-sm shrink-0 transition-all active:scale-[0.96] relative cursor-pointer ${
          hasIssues
            ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white hover:opacity-95'
            : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white hover:opacity-95'
        }`}
      >
        {hasIssues ? (
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
        ) : (
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
        )}
        {hasIssues && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-700 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow">
            {issueCount > 99 ? '99+' : issueCount}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isHovered && coords && (
              <div
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.centerX}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 9999,
                }}
                className="pointer-events-none select-none max-w-[calc(100vw-24px)]"
                dir="rtl"
              >
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.94 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="relative"
                >
                  {/* Top Arrow */}
                  <div
                    style={{ left: `calc(50% + ${coords.arrowOffset}px)` }}
                    className={`absolute -top-1.5 -translate-x-1/2 w-3.5 h-3.5 rotate-45 border-t-2 border-l-2 ${
                      hasIssues
                        ? 'bg-slate-900 border-amber-400'
                        : 'bg-slate-900 border-emerald-400'
                    } z-20`}
                  />

                  {/* Glowing Animated Outer Frame */}
                  <div
                    className={`p-[2px] rounded-2xl shadow-[0_14px_34px_rgba(15,23,42,0.55)] bg-[length:200%_auto] animate-shine ${
                      hasIssues
                        ? 'bg-[linear-gradient(90deg,#f59e0b,#f43f5e,#fde047,#f43f5e,#f59e0b)]'
                        : 'bg-[linear-gradient(90deg,#10b981,#22d3ee,#a7f3d0,#22d3ee,#10b981)]'
                    }`}
                  >
                    <div className="relative flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 px-4 py-2.5 rounded-[14px] bg-slate-900/95 backdrop-blur-md text-white sm:whitespace-nowrap">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                          hasIssues
                            ? 'bg-rose-500/20 border-amber-400/50 text-amber-300'
                            : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        }`}
                      >
                        {hasIssues ? (
                          <ShieldAlert className="w-4 h-4 animate-pulse" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 animate-pulse" />
                        )}
                      </span>

                      <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-sm">
                        الدعم السريع - فحص الأخطاء قبل الطباعة
                      </span>

                      <span
                        className={`text-sm sm:text-base font-black px-2.5 py-0.5 rounded-lg border ${
                          hasIssues
                            ? 'bg-rose-500/25 border-rose-400/60 text-amber-200'
                            : 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                        }`}
                      >
                        {tooltipStatusText}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
