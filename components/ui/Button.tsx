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
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
    outline: "border-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10",
    ghost: "text-slate-400 hover:text-yellow-500 hover:bg-slate-900",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};