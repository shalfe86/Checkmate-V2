import React, { useState } from 'react';
import { Crown, Menu } from 'lucide-react';
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
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 blur-md opacity-20 rounded-full"></div>
              <Crown className="h-6 w-6 text-yellow-500 relative z-10" strokeWidth={2.5} />
            </div>
            <span className="font-orbitron font-bold text-lg tracking-wider text-slate-100 hidden sm:block">
              CHECKMATE <span className="text-yellow-500">JACKPOT</span>
            </span>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => openAuth('login')}>
              LOG IN
            </Button>
            <Button variant="primary" size="sm" className="font-bold" onClick={() => openAuth('signup')}>
              JOIN THE GAME
            </Button>
          </div>

          {/* Mobile Menu Icon (Placeholder) */}
          <div className="md:hidden text-slate-400">
            <Menu className="h-6 w-6" onClick={() => openAuth('login')} />
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        defaultMode={authMode}
      />
    </>
  );
};