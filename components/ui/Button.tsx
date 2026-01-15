import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyles = "relative font-bold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 group tracking-wide overflow-hidden active:scale-95";
  
  const variants = {
    primary: "bg-white text-black hover:bg-slate-200 shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)] border border-transparent",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/50 shadow-lg",
    outline: "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-white/40 backdrop-blur-sm",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "h-9 px-4 text-[10px] rounded-lg uppercase",
    md: "h-12 px-6 text-xs rounded-xl uppercase",
    lg: "h-14 px-8 text-sm rounded-xl uppercase",
  };

  // Special Gold Variant Override for specific marketing uses
  if (className.includes('gold-btn')) {
     variants.primary = "bg-gradient-to-b from-[#FCEda3] via-[#D4AF37] to-[#996515] text-black border-none shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] hover:brightness-110";
  }

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};