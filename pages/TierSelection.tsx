import React from 'react';
import { TIERS } from '../constants';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { HoloPiece } from '../components/ui/HoloPiece';
import { Trophy, Clock, DollarSign, ShieldAlert, ChevronRight, Crown, FileText, Mail, Scale } from 'lucide-react';
import { TierConfig, TierLevel } from '../types';

export const TierSelection: React.FC = () => {
  const { selectTier } = useGame();

  const handleSelect = (tierId: TierLevel) => {
    selectTier(tierId);
  };

  const getIcon = (id: TierLevel) => {
    switch(id) {
      case TierLevel.TIER_1: return <ShieldAlert className="h-6 w-6 text-slate-400" />;
      case TierLevel.TIER_2: return <DollarSign className="h-6 w-6 text-yellow-400" />;
      case TierLevel.TIER_3: return <Trophy className="h-6 w-6 text-yellow-600 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]" />;
    }
  };

  // Sort tiers to put Tier 3 last in the map, but we might want to highlight it specifically
  const tier3 = TIERS[TierLevel.TIER_3];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      
      <div className="flex-1 container mx-auto px-4 z-10 pt-24 pb-12 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Side: Hero Text & Cards */}
          <div className="flex-1 w-full space-y-8">
            <div className="text-center lg:text-left space-y-2">
              <h1 className="text-6xl md:text-8xl font-black text-white font-orbitron leading-none tracking-tight">
                PLAY CHESS<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 neon-glow">
                  WIN BIG
                </span>
              </h1>
              
              {/* Highlight Tier 3 Jackpot */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
                <div className="px-6 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3 backdrop-blur-md">
                   <Trophy className="text-yellow-500 animate-pulse" size={24} />
                   <div className="flex flex-col text-left">
                     <span className="text-xs text-yellow-500/80 font-mono uppercase tracking-widest">Grandmaster Jackpot</span>
                     <span className="text-2xl font-bold text-white font-orbitron">${tier3.jackpotSplit.toFixed(2)} USD</span>
                   </div>
                </div>
              </div>

              <p className="text-slate-400 text-lg max-w-xl mx-auto lg:mx-0 pt-4">
                The arena is open. Stake your claim in the ultimate test of strategy and speed.
              </p>
            </div>

            {/* Compact Tier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4">
              {Object.values(TIERS).map((tier: TierConfig) => {
                const isTier3 = tier.id === TierLevel.TIER_3;
                return (
                  <Card 
                    key={tier.id} 
                    className={`
                      relative group border-slate-800 bg-slate-900/60 backdrop-blur-sm
                      hover:border-yellow-500/50 transition-all duration-300 cursor-pointer overflow-hidden
                      ${isTier3 ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] transform md:-translate-y-4' : ''}
                    `}
                    onClick={() => handleSelect(tier.id)}
                  >
                    {/* Active Gradient Background for hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity
                      ${isTier3 ? 'from-yellow-500 to-yellow-900' : 'from-slate-500 to-transparent'}
                    `} />

                    {/* Best Value / High Stakes Label */}
                    {isTier3 && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 font-orbitron">
                        HIGH STAKES
                      </div>
                    )}

                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        {getIcon(tier.id)}
                        {tier.entryFee > 0 ? (
                           <span className={`font-orbitron font-bold ${isTier3 ? 'text-xl text-yellow-400' : 'text-yellow-600'}`}>
                             ${tier.entryFee}
                           </span>
                        ) : (
                           <span className="font-mono text-xs text-slate-500">FREE</span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className={`font-orbitron font-bold ${isTier3 ? 'text-white text-lg' : 'text-slate-200 text-sm'}`}>
                          {tier.name}
                        </h3>
                        <div className="flex items-center text-xs text-slate-400 mt-2 space-x-2 font-mono">
                           <Clock className="h-3 w-3" />
                           <span>{tier.timeControl.initial}+{tier.timeControl.increment}</span>
                           <span className="text-slate-600">|</span>
                           <span>Max {tier.timeControl.maxCap}s</span>
                        </div>
                      </div>

                      <div className={`pt-3 flex justify-between items-center border-t ${isTier3 ? 'border-yellow-500/20' : 'border-white/5'}`}>
                         <span className={`text-xs ${isTier3 ? 'text-yellow-500/80 font-bold' : 'text-slate-500'}`}>
                           {tier.jackpotSplit > 0 ? `Win $${tier.jackpotSplit}` : 'Practice Mode'}
                         </span>
                         <ChevronRight className={`h-4 w-4 ${isTier3 ? 'text-yellow-500' : 'text-slate-600'} group-hover:translate-x-1 transition-transform`} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Side: Hologram */}
          <div className="flex-1 w-full hidden lg:flex justify-center items-center">
             <HoloPiece />
          </div>

          {/* Mobile Hologram Placeholder */}
          <div className="lg:hidden w-full h-48 relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 mt-4">
             <div className="absolute inset-0 flex items-center justify-center">
                <Crown className="text-yellow-500/20 w-32 h-32 animate-pulse" />
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 backdrop-blur z-10 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
             <Crown className="h-4 w-4 text-slate-400" />
             <span className="text-xs text-slate-500 font-orbitron">CHECKMATE JACKPOT &copy; {new Date().getFullYear()}</span>
          </div>
          
          <div className="flex items-center gap-8">
             <a href="#" className="flex items-center gap-2 text-xs text-slate-400 hover:text-yellow-500 transition-colors">
               <FileText size={14} /> Rules
             </a>
             <a href="#" className="flex items-center gap-2 text-xs text-slate-400 hover:text-yellow-500 transition-colors">
               <Scale size={14} /> Terms of Service
             </a>
             <a href="#" className="flex items-center gap-2 text-xs text-slate-400 hover:text-yellow-500 transition-colors">
               <Mail size={14} /> Contact
             </a>
          </div>
        </div>
      </footer>

    </div>
  );
};