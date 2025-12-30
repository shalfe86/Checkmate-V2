import React from 'react';
import { Crown } from 'lucide-react';

export const HoloPiece: React.FC = () => {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center hologram-container overflow-visible pointer-events-none">
      {/* Base Grid */}
      <div className="absolute bottom-10 w-[400px] h-[400px] holo-grid opacity-30 animate-pulse"></div>

      {/* Rotating Ring */}
      <div className="absolute w-[300px] h-[300px] rounded-full border-2 border-yellow-500/30 border-dashed"
           style={{ animation: 'spin-ring 10s linear infinite' }}></div>
      <div className="absolute w-[340px] h-[340px] rounded-full border border-yellow-500/10"
           style={{ animation: 'spin-ring 15s linear infinite reverse' }}></div>

      {/* The Piece */}
      <div className="holo-piece relative z-10">
        {/* Glow effect behind */}
        <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full"></div>
        
        {/* SVG Piece */}
        <Crown 
          size={200} 
          strokeWidth={0.5}
          className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]"
          fill="rgba(234, 179, 8, 0.1)"
        />
        
        {/* Scanlines overlay on the piece */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full blur-[1px] animate-bounce delay-75"></div>
      <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-yellow-400 rounded-full blur-[1px] animate-pulse"></div>
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-yellow-600 rounded-full blur-[1px] animate-bounce"></div>
    </div>
  );
};