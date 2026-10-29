import React, { useLayoutEffect, useRef, useState } from 'react';

interface ActualGradeTooltipProps {
  x: number;
  y: number;
  text: string;
}

export const ActualGradeTooltip: React.FC<ActualGradeTooltipProps> = ({ x, y, text }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    boxLeft: number;
    boxTop: number;
    arrowLeft: number;
    placeBelow: boolean;
  }>({
    boxLeft: x,
    boxTop: Math.max(18, y - 16),
    arrowLeft: 0,
    placeBelow: false,
  });
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const updatePosition = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
      const margin = 8;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const idealLeft = x - w / 2;
      const clampedLeft = Math.max(margin, Math.min(vw - w - margin, idealLeft));
      const arrowLeft = Math.max(20, Math.min(w - 20, x - clampedLeft));

      const placeBelow = y - h - 20 < margin;
      const boxTop = placeBelow ? y + 58 : y - h - 16;

      setPos({
        boxLeft: clampedLeft,
        boxTop: Math.max(margin, boxTop),
        arrowLeft,
        placeBelow,
      });
      setMeasured(true);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [x, y, text]);

  return (
    <div
      ref={tooltipRef}
      style={{
        left: measured ? `${pos.boxLeft}px` : '50%',
        top: measured ? `${pos.boxTop}px` : `${Math.max(18, y - 16)}px`,
        transform: measured ? 'none' : 'translate(-50%, -100%)',
        maxWidth: 'calc(100vw - 16px)',
        width: 'max-content',
      }}
      className="fixed z-[99999] pointer-events-none px-3.5 py-2 rounded-xl bg-slate-900 text-amber-300 font-black text-xs sm:text-sm md:text-base text-center leading-relaxed whitespace-pre-line break-words shadow-[0_10px_25px_rgba(0,0,0,0.45)] border-2 border-amber-400 flex items-center justify-center"
      dir="rtl"
    >
      <span>{text}</span>
      {pos.placeBelow ? (
        <div
          style={{
            left: measured ? `${pos.arrowLeft}px` : '50%',
            transform: 'translateX(-50%)',
          }}
          className="absolute bottom-full w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[16px] border-b-amber-400"
        />
      ) : (
        <div
          style={{
            left: measured ? `${pos.arrowLeft}px` : '50%',
            transform: 'translateX(-50%)',
          }}
          className="absolute top-full w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-amber-400"
        />
      )}
    </div>
  );
};
