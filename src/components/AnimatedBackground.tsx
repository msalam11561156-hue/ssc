import React from 'react';

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-slate-900 overflow-hidden">
      <style>
        {`
          .wave-layer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 200%;
            height: 100%;
            background-repeat: repeat-x;
            background-position: bottom center;
            background-size: 50% 100%;
            will-change: transform;
          }
          
          @keyframes wave-slide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes wave-slide-reverse {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
        `}
      </style>

      {/* Wave Silver 25% */}
      <div 
        className="wave-layer" 
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 800' preserveAspectRatio='none'%3E%3Cpath fill='rgba(192,192,192,0.25)' d='M 0 300 Q 360 100 720 300 T 1440 300 V 800 H 0 Z'/%3E%3C/svg%3E\")",
          animation: "wave-slide 22s linear infinite"
        }} 
      />
      
      {/* Wave 50% */}
      <div 
        className="wave-layer" 
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 800' preserveAspectRatio='none'%3E%3Cpath fill='rgba(0,0,0,0.5)' d='M 0 450 Q 360 650 720 450 T 1440 450 V 800 H 0 Z'/%3E%3C/svg%3E\")",
          animation: "wave-slide-reverse 18s linear infinite"
        }} 
      />
      
      {/* Wave 90% */}
      <div 
        className="wave-layer" 
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 800' preserveAspectRatio='none'%3E%3Cpath fill='rgba(0,0,0,0.9)' d='M 0 600 Q 360 450 720 600 T 1440 600 V 800 H 0 Z'/%3E%3C/svg%3E\")",
          animation: "wave-slide 14s linear infinite"
        }} 
      />
    </div>
  );
};
