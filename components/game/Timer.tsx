import React from 'react';

interface TimerProps {
  time: number;
  maxTime: number;
  isActive: boolean;
  label: string;
}

export const Timer: React.FC<TimerProps> = ({ time, maxTime, isActive, label }) => {
  const percentage = Math.min((time / maxTime) * 100, 100);
  const isLow = time < 10;

  // Format time (mm:ss.d)
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const deciseconds = Math.floor((time * 10) % 10);
  
  const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className={`relative w-32 md:w-40 p-3 rounded-lg border transition-all duration-200 ${
      isActive 
        ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
        : 'border-slate-800 bg-slate-900 opacity-80'
    }`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{label}</span>
        {isActive && <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />}
      </div>
      
      <div className={`text-2xl font-mono font-bold tracking-widest ${
        isLow ? 'text-red-500' : 'text-slate-100'
      }`}>
        {displayTime}<span className="text-sm opacity-60">.{deciseconds}</span>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full rounded-b-lg overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${isLow ? 'bg-red-500' : 'bg-yellow-500'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};