import React from 'react';

interface ActionMenuButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  text: string;
  bgGradient: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
}

export const ActionMenuButton: React.FC<ActionMenuButtonProps> = ({
  onClick,
  icon,
  text: rawText,
  bgGradient,
  className = '',
  style,
  disabled = false,
  title,
}) => {
  const text = rawText.replace(/^طباعة\s*/, '').trim();
  const isMarquee = text.length > 28;

  if (disabled) {
    return (
      <div className="relative w-full">
        <button
          type="button"
          aria-disabled="true"
          className={`relative overflow-hidden flex items-center justify-center w-full shrink-0 whitespace-nowrap bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-white/70 font-bold h-[54px] rounded-xl border-2 border-slate-600 shadow-sm text-lg cursor-not-allowed select-none ${className}`}
          style={style}
        >
          {isMarquee ? (
            <div className="w-full overflow-hidden flex items-center h-full relative pointer-events-none" dir="ltr">
              <div 
                className="animate-btn-marquee-ltr marquee-continuous items-center [animation-play-state:running!important]" 
                dir="rtl"
                style={{ animationPlayState: 'running' }}
              >
                <div className="flex items-center gap-2 shrink-0 px-8">
                  <span className="shrink-0">{icon}</span>
                  <span className="font-bold text-lg tracking-wide">{text}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 px-8">
                  <span className="shrink-0">{icon}</span>
                  <span className="font-bold text-lg tracking-wide">{text}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 px-4">
              <span className="shrink-0">{icon}</span>
              <span className="font-bold text-lg tracking-wide">{text}</span>
            </div>
          )}
        </button>
      </div>
    );
  }

  if (isMarquee) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`group relative overflow-hidden flex items-center justify-center w-full shrink-0 whitespace-nowrap ${bgGradient} bg-[length:200%_auto] animate-shine text-white font-bold h-[54px] rounded-xl transition-all active:scale-[0.98] border border-slate-900 shadow-sm text-lg cursor-pointer select-none ${className}`}
        style={{ animationDuration: '6s', ...style }}
      >
        <div className="w-full overflow-hidden flex items-center h-full relative" dir="ltr">
          <div className="animate-btn-marquee-ltr items-center" dir="rtl">
            <div className="flex items-center gap-2 shrink-0 px-8">
              {icon}
              <span>{text}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 px-8">
              {icon}
              <span>{text}</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-full gap-2 shrink-0 whitespace-nowrap ${bgGradient} bg-[length:200%_auto] animate-shine text-white font-bold h-[54px] px-4 rounded-xl transition-all active:scale-[0.98] border border-slate-900 shadow-sm text-lg cursor-pointer ${className}`}
      style={{ animationDuration: '6s', ...style }}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
};
