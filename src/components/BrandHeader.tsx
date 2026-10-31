import React from 'react';
import { motion } from 'motion/react';
import brandShield from '../assets/images/brand_shield.png';

interface BrandHeaderProps {
  variant?: 'gold' | 'black';
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ variant = 'black' }) => {
  const textStyles = variant === 'gold'
    ? "text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-200 to-amber-500"
    : "text-black";

  return (
    <div className="flex flex-col items-center gap-2 pb-3 mb-2">
      {/* Professional Floating & Glowing Logo */}
      <motion.div
        animate={{ 
          y: [0, -8, 0],
          scale: [1, 1.05, 1],
          rotateY: [0, 10, 0, -10, 0],
          filter: [
            "drop-shadow(0 0 5px rgba(251,191,36,0.2))", 
            "drop-shadow(0 0 20px rgba(251,191,36,0.8))", 
            "drop-shadow(0 0 5px rgba(251,191,36,0.2))"
          ]
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          rotateY: { repeat: Infinity, duration: 6, ease: "easeInOut" },
          filter: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        }}
        className="relative z-10 mb-1"
      >
        <img 
          src={brandShield} 
          alt="Brand Shield Logo" 
          className="w-20 h-20 md:w-24 md:h-24 object-contain select-none pointer-events-none" 
        />
        {/* Background Glow Effect */}
        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full -z-10 animate-pulse" />
      </motion.div>

      <h3 className={`text-2xl font-black uppercase tracking-widest text-center drop-shadow-sm ${textStyles}`}>
        SMART CONTROL
      </h3>
      
      {/* Animated Horizontal Line */}
      <div className="w-full h-[2px] bg-slate-700/80 rounded-full overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />
      </div>
    </div>
  );
};
