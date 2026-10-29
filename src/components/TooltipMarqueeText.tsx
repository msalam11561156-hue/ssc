import React, { useRef, useState, useEffect } from 'react';

interface TooltipMarqueeTextProps {
  text: string;
  className?: string;
  align?: 'right' | 'center';
  speed?: number; // pixels per second (was 40, now 58: increased by 2 notches)
}

export const TooltipMarqueeText: React.FC<TooltipMarqueeTextProps> = ({
  text,
  className = '',
  align = 'right',
  speed = 58,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [dimensions, setDimensions] = useState({
    unitDistance: 800,
    duration: 14,
  });

  useEffect(() => {
    let isMounted = true;

    const checkOverflow = () => {
      if (!isMounted) return;
      if (containerRef.current && measurerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = measurerRef.current.scrollWidth;
        // Text exceeds one line if textWidth is greater than containerWidth
        if (textWidth > containerWidth + 2) {
          setIsOverflowing(true);
          // Gap of 64px (px-8 on items: 32px left + 32px right)
          const unitDistance = textWidth + 64;
          // Calculate duration based on the increased speed (speed=58)
          const calculatedDuration = Math.max(8, Math.round(unitDistance / speed));
          setDimensions({
            unitDistance,
            duration: calculatedDuration,
          });
        } else {
          setIsOverflowing(false);
        }
      }
    };

    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    const timer1 = setTimeout(checkOverflow, 40);
    const timer2 = setTimeout(checkOverflow, 120);

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => checkOverflow()).catch(() => {});
    }

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [text, speed]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden relative">
      {/* Hidden measurer to test true single-line width without wrapping */}
      <span
        ref={measurerRef}
        aria-hidden="true"
        className={`invisible absolute pointer-events-none whitespace-nowrap ${className}`}
        style={{ top: 0, right: 0 }}
      >
        {text}
      </span>

      {!isOverflowing ? (
        // Does not exceed one line: static display
        <div
          className={`w-full whitespace-nowrap overflow-hidden text-ellipsis ${
            align === 'center' ? 'text-center' : 'text-right'
          }`}
          dir="rtl"
        >
          <span className={className}>{text}</span>
        </div>
      ) : (
        // Exceeds one line: smoothly moves from left to right all the way to the right edge of the screen
        <div className="w-full overflow-hidden flex items-center relative group/marquee" dir="ltr">
          <div
            className="flex items-center will-change-transform group-hover/marquee:[animation-play-state:paused]"
            style={{
              width: 'max-content',
              marginLeft: `-${dimensions.unitDistance}px`,
              animation: `tooltip-marquee-ltr ${dimensions.duration}s linear infinite`,
              ['--marquee-distance' as any]: `${dimensions.unitDistance}px`,
            }}
          >
            {/* Child 1: starts to the left, enters from the left edge */}
            <div className="flex items-center shrink-0 px-8" dir="rtl">
              <span className={className}>{text}</span>
            </div>
            {/* Child 2: starts at left edge (0px), visible immediately, travels across to the right edge */}
            <div className="flex items-center shrink-0 px-8" dir="rtl">
              <span className={className}>{text}</span>
            </div>
            {/* Child 3: tail for wide viewports */}
            <div className="flex items-center shrink-0 px-8" dir="rtl">
              <span className={className}>{text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
