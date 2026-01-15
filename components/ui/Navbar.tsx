import React, { useState } from 'react';
import { Crown, Menu, User, ChevronRight, LogOut, Wallet, ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import { AuthModal } from '../auth/AuthModal';
import { useGame } from '../../context/GameContext';

export const Navbar: React.FC = () => {
  const { user, profile, wallet, logout, isAdmin, setView } = useGame();
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
          <div className="flex items-center gap-4 pl-4 cursor-pointer" onClick={() => setView('lobby')}>
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

          {/* Actions */}
          {user ? (
            <div className="flex items-center gap-3 pr-2">
              
              {/* Admin Access */}
              {isAdmin && (
                <button
                   onClick={() => setView('admin')}
                   className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-900/50 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <ShieldAlert size={14} />
                  <span className="hidden md:inline">Command</span>
                </button>
              )}

              {/* Balance Display */}
              <div className="hidden md:flex items-center gap-2 bg-slate-900/50 border border-yellow-500/20 rounded-full px-4 py-1.5">
                 <Wallet size={14} className="text-yellow-500" />
                 <span className="font-mono text-sm text-yellow-400 font-bold">${wallet?.balance ?? '0.00'}</span>
              </div>
              
              {/* Profile Chip */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1">
                 <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Av" className="h-full w-full object-cover" />
                    ) : (
                      <User size={14} className="text-slate-400" />
                    )}
                 </div>
                 <span className="text-xs font-bold text-slate-300 max-w-[80px] truncate">
                   {profile?.username || user.email?.split('@')[0]}
                 </span>
              </div>

              {/* Logout - Desktop */}
              <button 
                onClick={() => logout()}
                className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-all group"
                title="Logout"
              >
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
              <button 
                onClick={() => openAuth('login')} 
                className="px-6 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider rounded-full hover:bg-white/5"
              >
                Log In
              </button>
              <button 
                onClick={() => openAuth('signup')}
                className="px-6 py-2 bg-slate-100 text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2 group/btn"
              >
                Sign Up <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Mobile Menu Icon */}
          <div className="md:hidden pr-2 flex items-center gap-2">
             {user && (
               <div className="flex items-center gap-1 bg-slate-900/50 border border-yellow-500/20 rounded-full px-3 py-1">
                 <span className="font-mono text-xs text-yellow-400 font-bold">${wallet?.balance ?? '0.00'}</span>
               </div>
             )}
             <button onClick={() => user ? logout() : openAuth('login')} className="p-2 text-slate-300 hover:text-white">
                {user ? <LogOut className="h-5 w-5" /> : <User className="h-5 w-5" />}
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