import React, { useState, useEffect } from 'react';
import { TIERS } from '../constants';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { HoloPiece } from '../components/ui/HoloPiece';
import { Button } from '../components/ui/Button';
import { Trophy, Clock, DollarSign, ShieldAlert, ChevronRight, Crown, FileText, Mail, Scale, Sparkles, Zap, Target, Star, Hexagon } from 'lucide-react';
import { TierConfig, TierLevel } from '../types';

export const TierSelection: React.FC = () => {
  const { selectTier } = useGame();
  const tier3 = TIERS[TierLevel.TIER_3];
  const tier2 = TIERS[TierLevel.TIER_2];
  const tier1 = TIERS[TierLevel.TIER_1];

  // Mouse Parallax Logic
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 20, 
        y: (e.clientY / window.innerHeight - 0.5) * 20 
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-[#020202] text-white selection:bg-yellow-500/30 overflow-x-hidden">
      
      {/* 1. Deep Atmospheric Parallax Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Moving Orb 1 */}
        <div 
          className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full blur-[150px] opacity-20"
          style={{ 
            background: 'radial-gradient(circle, #4a3805 0%, transparent 70%)',
            transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)` 
          }}
        ></div>
        {/* Moving Orb 2 */}
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-10"
          style={{ 
            background: 'radial-gradient(circle, #1a202c 0%, transparent 70%)',
            transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)` 
          }}
        ></div>
        
        {/* Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
             backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             transform: `perspective(1000px) rotateX(60deg) translateY(${mousePos.y}px) scale(2)`
          }}
        ></div>
      </div>

      <div className="flex-1 container mx-auto px-4 z-10 pt-32 pb-24">
        
        {/* 2. Hero Section Typography */}
        <div className="text-center mb-20 space-y-6 relative">
           <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300">
                Mainnet Live v2.4
              </span>
           </div>
           
           <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-orbitron leading-[0.9] tracking-tighter">
             PLAY FOR <br className="hidden md:block"/>
             <span className="text-gold-gradient relative inline-block">
               ETERNITY
               <span className="absolute -inset-2 bg-yellow-500/20 blur-xl opacity-50 rounded-full pointer-events-none"></span>
             </span>
           </h1>
           
           <p className="text-slate-400 max-w-xl mx-auto text-lg font-tech font-light tracking-wide leading-relaxed">
             The definitive high-stakes chess platform. 
             <span className="text-white font-medium"> Zero latency. Instant settlement.</span>
           </p>
        </div>

        {/* 3. Advanced Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          
          {/* TIER 3 - THE MONOLITH (Spans 8 cols) */}
          <div className="lg:col-span-8 lg:row-span-2 group perspective-1000">
             <Card 
               enableTilt 
               className="h-full border-yellow-500/20 bg-gradient-to-b from-[#0F0F12] to-[#050505] shadow-[0_0_60px_-15px_rgba(234,179,8,0.15)] hover:border-yellow-500/40"
             >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                
                <div className="flex flex-col md:flex-row h-full relative z-20">
                  <div className="p-8 md:p-12 flex-1 flex flex-col justify-between">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 text-yellow-500 font-bold tracking-[0.2em] text-[10px] uppercase border border-yellow-500/30 px-3 py-1 rounded-full bg-yellow-500/5">
                          <Crown size={12} /> Championship Series
                        </div>
                        <h2 className="text-4xl md:text-6xl font-orbitron font-black text-white leading-[0.9]">
                          GRAND<br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">MASTER</span>
                        </h2>
                        <p className="text-slate-400 pt-2 max-w-xs font-tech text-sm border-l-2 border-yellow-500/30 pl-4">
                          {tier3.description}
                        </p>
                     </div>

                     <div className="pt-12 space-y-8">
                        <div>
                           <div className="flex items-baseline gap-2">
                             <span className="text-7xl font-orbitron font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                               ${tier3.jackpotSplit}
                             </span>
                             <span className="text-sm font-tech text-yellow-500/80 font-bold uppercase tracking-widest">USD Win</span>
                           </div>
                           <div className="h-px w-full bg-gradient-to-r from-yellow-500/50 to-transparent mt-4"></div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                           <div className="flex flex-col bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Format</span>
                              <span className="font-mono text-xs text-white">25+1 Bullet</span>
                           </div>
                           <div className="flex flex-col bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Entry</span>
                              <span className="font-mono text-xs text-yellow-400 font-bold">$2.00</span>
                           </div>
                        </div>

                        <Button 
                          onClick={() => selectTier(TierLevel.TIER_3)}
                          className="w-full md:w-auto gold-btn" 
                          size="lg"
                        >
                          INITIALIZE PROTOCOL
                        </Button>
                     </div>
                  </div>

                  {/* Hologram Container */}
                  <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-auto overflow-hidden flex items-center justify-center">
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 md:hidden"></div>
                     <div className="absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent z-10 hidden md:block"></div>
                     
                     <div className="scale-75 md:scale-100 md:translate-x-10">
                       <HoloPiece />
                     </div>
                  </div>
                </div>
             </Card>
          </div>

          {/* TIER 2 - THE CHALLENGER (Spans 4 cols) */}
          <div className="lg:col-span-4 lg:row-span-1">
             <Card 
               enableTilt
               className="h-full border-blue-500/20 bg-[#0A0A0E] cursor-pointer hover:border-blue-500/50 group"
               onClick={() => selectTier(TierLevel.TIER_2)}
             >
                <div className="p-8 h-full flex flex-col justify-between relative z-10">
                   <div className="flex justify-between items-start">
                      <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                         <Target size={24} />
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Potential</span>
                        <span className="text-3xl font-bold font-orbitron text-white">${tier2.jackpotSplit}</span>
                      </div>
                   </div>
                   
                   <div className="mt-8">
                      <h3 className="text-xl font-bold text-white mb-2 font-orbitron">{tier2.name}</h3>
                      <div className="w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
                        <div className="w-3/4 h-full bg-blue-500"></div>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-xs font-tech">
                         <span>Entry: ${tier2.entryFee}</span>
                         <span className="flex items-center gap-1 text-blue-400">30+1 Rapid</span>
                      </div>
                   </div>
                </div>
             </Card>
          </div>

          {/* TIER 1 - THE TRAINER (Spans 4 cols) */}
          <div className="lg:col-span-4 lg:row-span-1">
             <Card 
               enableTilt
               className="h-full border-white/10 bg-[#0A0A0E] cursor-pointer hover:border-white/30 group"
               onClick={() => selectTier(TierLevel.TIER_1)}
             >
                <div className="p-8 h-full flex flex-col justify-between relative z-10">
                   <div className="flex justify-between items-start">
                      <div className="p-3 rounded-2xl bg-slate-800 text-slate-400">
                         <Hexagon size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 bg-slate-200 px-2 py-1 rounded uppercase tracking-wider">Free Tier</span>
                   </div>
                   
                   <div className="mt-8">
                      <h3 className="text-xl font-bold text-slate-200 mb-2 font-orbitron">{tier1.name}</h3>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">Risk-free environment for strategy calibration.</p>
                      <div className="flex items-center justify-between text-slate-500 text-xs font-tech border-t border-white/5 pt-3">
                         <span>Practice Mode</span>
                         <span className="flex items-center gap-1 text-slate-300">40+2 Classic</span>
                      </div>
                   </div>
                </div>
             </Card>
          </div>

        </div>

        {/* 4. Stats Ribbon */}
        <div className="mt-32 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="container mx-auto max-w-7xl">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
                {[
                  { label: 'Total Volume', value: '$2.4M+' },
                  { label: 'Active Nodes', value: '1,204' },
                  { label: 'Avg Payout', value: '142ms' },
                  { label: 'Security', value: 'AES-256' },
                ].map((stat, i) => (
                  <div key={i} className="py-8 text-center group cursor-default">
                     <div className="text-3xl font-bold font-orbitron text-white group-hover:text-gold-gradient transition-colors duration-300">{stat.value}</div>
                     <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-2 font-tech">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
        </div>

      </div>

      {/* 5. Minimalist Footer */}
      <footer className="border-t border-white/5 bg-[#050505] py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
               <Crown className="h-4 w-4 text-slate-400" />
               <span className="text-xs text-slate-500 font-orbitron tracking-widest">CHECKMATE JACKPOT</span>
             </div>
             <p className="text-[10px] text-slate-600 max-w-xs">
               Decentralized skill-gaming protocol. All rights reserved {new Date().getFullYear()}.
             </p>
          </div>
          
          <div className="flex items-center gap-8">
             <a href="#" className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
               Rules
             </a>
             <a href="#" className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
               Terms
             </a>
             <a href="#" className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
               Contact
             </a>
          </div>
        </div>
      </footer>

    </div>
  );
};