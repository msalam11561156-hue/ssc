import React from 'react';

export const AnimatedBackground = React.memo(() => {
  return (
    <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-slate-950 via-slate-900 to-black overflow-hidden pointer-events-none select-none [contain:strict]">
      <div
        className="absolute inset-0 bg-no-repeat bg-bottom bg-cover"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 800' preserveAspectRatio='none'%3E%3Cpath fill='rgba(192,192,192,0.22)' d='M 0 300 Q 360 100 720 300 T 1440 300 V 800 H 0 Z'/%3E%3Cpath fill='rgba(0,0,0,0.5)' d='M 0 450 Q 360 650 720 450 T 1440 450 V 800 H 0 Z'/%3E%3Cpath fill='rgba(0,0,0,0.9)' d='M 0 600 Q 360 450 720 600 T 1440 600 V 800 H 0 Z'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
});
