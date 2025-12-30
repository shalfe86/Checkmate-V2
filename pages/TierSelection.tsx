import React from 'react';
import { TIERS } from '../constants';
import { useGame } from '../context/GameContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trophy, Clock, Zap, DollarSign, ShieldAlert } from 'lucide-react';
import { TierConfig, TierLevel } from '../types';

export const TierSelection: React.FC = () => {
  const { selectTier } = useGame();

  const handleSelect = (tierId: TierLevel) => {
    selectTier(tierId);
  };

  const getIcon = (id: TierLevel) => {
    switch(id) {
      case TierLevel.TIER_1: return <ShieldAlert className="h-8 w-8 text-slate-400" />;
      case TierLevel.TIER_2: return <DollarSign className="h-8 w-8 text-yellow-400" />;
      case TierLevel.TIER_3: return <Trophy className="h-8 w-8 text-yellow-600 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-600 neon-glow mb-4">
          CHECKMATE JACKPOT
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Select your stakes. Play for glory, play for cash. 
          <span className="text-yellow-500 ml-1">Speed is key.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(TIERS).map((tier: TierConfig) => (
          <Card 
            key={tier.id} 
            className={`
              relative overflow-hidden transition-all duration-300 hover:scale-105
              ${tier.id === TierLevel.TIER_3 ? 'border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'hover:border-slate-600'}
            `}
          >
            {/* Background Gradient Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none
               ${tier.id === TierLevel.TIER_1 ? 'from-slate-500 to-slate-900' : ''}
               ${tier.id === TierLevel.TIER_2 ? 'from-yellow-400 to-slate-900' : ''}
               ${tier.id === TierLevel.TIER_3 ? 'from-yellow-600 via-yellow-900 to-black' : ''}
            `} />

            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  {getIcon(tier.id)}
                </div>
                {tier.entryFee === 0 && <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">PRACTICE</span>}
                {tier.entryFee > 0 && <span className="bg-yellow-500 text-slate-950 font-bold text-xs px-2 py-1 rounded">REAL MONEY</span>}
              </div>
              <CardTitle className="mt-4 text-2xl font-orbitron">{tier.name}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-slate-400 text-sm h-10">{tier.description}</p>
              
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-slate-400"><Clock className="h-4 w-4 mr-2" /> Time Control</span>
                  <span className="font-mono text-slate-200">{tier.timeControl.initial}s + {tier.timeControl.increment}s</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-slate-400"><Zap className="h-4 w-4 mr-2" /> Max Cap</span>
                  <span className="font-mono text-slate-200">{tier.timeControl.maxCap}s</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-slate-400"><DollarSign className="h-4 w-4 mr-2" /> Entry</span>
                  <span className="font-bold text-yellow-500">
                    {tier.entryFee === 0 ? "FREE" : `$${tier.entryFee.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {tier.entryFee > 0 && (
                <div className="mt-4 p-3 bg-yellow-900/10 border border-yellow-500/20 rounded text-center">
                  <div className="text-xs text-yellow-500/80 uppercase tracking-widest mb-1">Potential Win</div>
                  <div className="text-2xl font-bold text-yellow-400 neon-glow">${tier.jackpotSplit.toFixed(2)}</div>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full font-orbitron tracking-wider" 
                variant={tier.entryFee > 0 ? "primary" : "secondary"}
                onClick={() => handleSelect(tier.id)}
              >
                {tier.entryFee > 0 ? "PAY ENTRY" : "PLAY NOW"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};