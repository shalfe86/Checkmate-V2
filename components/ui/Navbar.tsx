import React, { useState } from 'react';
import { Crown, Menu, User, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { AuthModal } from '../auth/AuthModal';

export const Navbar: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/5 rounded-full px-2 py-2 shadow-[0_8px_40px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 hover:bg-black/60 hover:border-white/10 group">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 pl-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full group-hover:bg-yellow-500/30 transition-all"></div>
              <Crown className="h-5 w-5 text-yellow-400 relative z-10" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-bold text-sm tracking-[0.2em] text-white">
                CHECKMATE
              </span>
              <span className="text-[9px] text-yellow-500/80 font-mono tracking-wider uppercase">
                Jackpot Series
              </span>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
            <button 
              onClick={() => openAuth('login')} 
              className="px-6 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider rounded-full hover:bg-white/5"
            >
              Access
            </button>
            <button 
              onClick={() => openAuth('signup')}
              className="px-6 py-2 bg-slate-100 text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2 group/btn"
            >
              Initiate <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <div className="md:hidden pr-2">
            <button onClick={() => openAuth('login')} className="p-2 text-slate-300 hover:text-white">
               <User className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        defaultMode={authMode}
      />
    </>
  );
};