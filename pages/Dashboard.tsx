import React from 'react';
import { useGame } from '../context/GameContext';
import { TIERS } from '../constants';
import { TierLevel } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Target, Zap, Shield, Crown, TrendingUp, 
  Activity, Wallet, Lock, AlertTriangle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, profile, wallet, selectTier, setView } = useGame();
  
  // Monthly Cap Logic
  const MONTHLY_CAP = 500;
  const currentEarnings = wallet?.monthly_earnings || 0;
  const earningsPercentage = Math.min((currentEarnings / MONTHLY_CAP) * 100, 100);
  const isTier2Eligible = currentEarnings < MONTHLY_CAP;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 flex flex-col">
      <div className="container mx-auto max-w-6xl space-y-8 flex-1">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
           <div>
              <h1 className="text-3xl font-orbitron font-bold">
                OPERATOR DASHBOARD
              </h1>
              <p className="text-slate-400 font-tech text-sm mt-1">
                Welcome back, <span className="text-yellow-500 font-bold">{profile?.username || 'User'}</span>. System Ready.
              </p>
           </div>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  NETWORK: STABLE
              </div>
           </div>
        </div>

        {/* Top Grid: Stats & Wallet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* Wallet Card */}
           <Card className="border-yellow-500/20 bg-gradient-to-br from-slate-900 to-black">
              <div className="p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wallet size={80} />
                 </div>
                 <div className="relative z-10">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Balance</div>
                    <div className="text-4xl font-orbitron font-bold text-white mb-4">
                       ${wallet?.balance.toFixed(2) || '0.00'}
                    </div>
                    <div className="flex gap-2">
                       <Button size="sm" className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black">
                          Deposit
                       </Button>
                       <Button size="sm" variant="outline" className="flex-1">
                          Withdraw
                       </Button>
                    </div>
                 </div>
              </div>
           </Card>

           {/* Tier 2 Eligibility Monitor */}
           <Card className={`border-${isTier2Eligible ? 'blue' : 'red'}-500/20 bg-slate-900`}>
              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Tier 2 Eligibility</div>
                       <div className="flex items-center gap-2">
                          <Target size={16} className={isTier2Eligible ? "text-blue-400" : "text-red-400"} />
                          <span className={`font-bold ${isTier2Eligible ? "text-blue-400" : "text-red-400"}`}>
                             {isTier2Eligible ? "ACTIVE" : "RESTRICTED"}
                          </span>
                       </div>
                    </div>
                    {isTier2Eligible ? (
                       <Shield className="text-blue-500/20" size={32} />
                    ) : (
                       <Lock className="text-red-500/20" size={32} />
                    )}
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                       <span>Monthly Winnings</span>
                       <span>${currentEarnings.toFixed(2)} / ${MONTHLY_CAP} Cap</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-500 ${isTier2Eligible ? 'bg-blue-500' : 'bg-red-500'}`}
                         style={{ width: `${earningsPercentage}%` }}
                       ></div>
                    </div>
                    {!isTier2Eligible && (
                       <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
                          <AlertTriangle size={10} /> Monthly cap reached. Tier 2 disabled until reset.
                       </p>
                    )}
                 </div>
              </div>
           </Card>

           {/* Quick Stats */}
           <Card className="border-white/10 bg-slate-900">
              <div className="p-6 grid grid-cols-2 gap-4 h-full">
                 <div className="space-y-1">
                    <div className="text-xs text-slate-500 uppercase">Global Rank</div>
                    <div className="text-xl font-bold text-white">#4,291</div>
                    <div className="text-[10px] text-green-500 flex items-center gap-1">
                       <TrendingUp size={10} /> Top 15%
                    </div>
                 </div>
                 <div className="space-y-1">
                    <div className="text-xs text-slate-500 uppercase">Matches</div>
                    <div className="text-xl font-bold text-white">42</div>
                    <div className="text-[10px] text-slate-400">
                       28 W / 14 L
                    </div>
                 </div>
                 <div className="col-span-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-400">Current Streak</span>
                       <div className="flex gap-1">
                          {[1,2,3].map(i => (
                             <div key={i} className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                          ))}
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                       </div>
                    </div>
                 </div>
              </div>
           </Card>

        </div>

        {/* Section Title */}
        <div className="flex items-center gap-4 py-4">
           <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
           <h2 className="font-orbitron text-xl text-white tracking-wider flex items-center gap-2">
              <Activity size={18} className="text-yellow-500" /> 
              ACTIVE PROTOCOLS
           </h2>
           <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
        </div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

           {/* Tier 1 - Free */}
           <div 
             onClick={() => selectTier(TierLevel.TIER_1)}
             className="group relative cursor-pointer"
           >
              <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"></div>
              <Card className="h-full border-white/10 hover:border-white/30 transition-all bg-[#0A0A0C]">
                 <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                            <Zap size={20} />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">FREE</span>
                    </div>
                    <h3 className="text-lg font-bold font-orbitron text-white mb-4">{TIERS[TierLevel.TIER_1].name}</h3>
                    
                    <ul className="space-y-2 text-xs text-slate-400 font-tech mb-6 flex-1">
                        <li className="flex items-start gap-2">
                            <span className="text-slate-600">•</span> Unlimited free games
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-slate-600">•</span> Beginner-friendly AI opponent
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-slate-600">•</span> 40 sec start • 50 sec max
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-slate-600">•</span> +2 sec per move
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <span className="text-green-500">✓</span> No risk, all fun
                        </li>
                    </ul>

                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center text-slate-500 text-[10px] uppercase tracking-wider gap-2">
                           <Shield size={12} />
                           <span>Practice Protocol</span>
                        </div>
                    </div>
                 </div>
              </Card>
           </div>

           {/* Tier 2 - Challenger */}
           <div 
             onClick={() => isTier2Eligible ? selectTier(TierLevel.TIER_2) : null}
             className={`group relative ${isTier2Eligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
           >
              <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"></div>
              <Card className="h-full border-blue-500/20 hover:border-blue-500/50 transition-all bg-[#0A0A0C]">
                 <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-blue-900/20 rounded-lg text-blue-400">
                            <Target size={20} />
                        </div>
                        <span className="text-[10px] font-bold bg-blue-900/30 text-blue-300 border border-blue-500/30 px-2 py-1 rounded">
                            ENTRY ${TIERS[TierLevel.TIER_2].entryFee}
                        </span>
                    </div>
                    
                    <h3 className="text-lg font-bold font-orbitron text-white mb-1">{TIERS[TierLevel.TIER_2].name}</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-blue-400">${TIERS[TierLevel.TIER_2].jackpotSplit}</span>
                        <span className="text-xs text-slate-500 uppercase">Jackpot</span>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-400 font-tech mb-6 flex-1">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500/50">•</span> Medium difficulty AI
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500/50">•</span> $0.75 to pot • $0.25 house fee
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500/50">•</span> Pot: $5 start → $1,000 cap
                        </li>
                        <li className="flex items-start gap-2 text-blue-200">
                            <span className="text-blue-400">★</span> First to win takes the pot!
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500/50">•</span> 30 sec start • 35 sec max
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500/50">•</span> +1s/move (if {'<'}4s)
                        </li>
                    </ul>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                       <div className="space-y-1">
                           <div className="flex justify-between text-[10px] uppercase tracking-wider">
                              <span className="text-slate-500">Tier Limit</span>
                              {isTier2Eligible ? (
                                 <span className="text-blue-400">Qualified</span>
                              ) : (
                                 <span className="text-red-400">Cap Reached</span>
                              )}
                           </div>
                           <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${isTier2Eligible ? 'bg-blue-500' : 'bg-red-500'}`}
                                style={{ width: `${earningsPercentage}%` }}
                              ></div>
                           </div>
                       </div>
                    </div>
                 </div>
              </Card>
           </div>

           {/* Tier 3 - Grandmaster */}
           <div 
             onClick={() => selectTier(TierLevel.TIER_3)}
             className="group relative cursor-pointer"
           >
              <div className="absolute inset-0 bg-yellow-500/5 rounded-2xl blur-xl group-hover:bg-yellow-500/10 transition-all opacity-0 group-hover:opacity-100"></div>
              <Card className="h-full border-yellow-500/20 hover:border-yellow-500/50 transition-all bg-gradient-to-b from-[#121214] to-black">
                 <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-400">
                            <Crown size={20} />
                        </div>
                        <span className="text-[10px] font-bold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded">
                            ENTRY ${TIERS[TierLevel.TIER_3].entryFee}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold font-orbitron text-white mb-1">{TIERS[TierLevel.TIER_3].name}</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                            ${TIERS[TierLevel.TIER_3].jackpotSplit}
                        </span>
                        <span className="text-xs text-slate-500 uppercase">Jackpot</span>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-400 font-tech mb-6 flex-1">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500/50">•</span> Elite AI (wins 99% of games)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500/50">•</span> $1 to pot • $1 house fee
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500/50">•</span> Vault: $5 start → $100k+ cap
                        </li>
                        <li className="flex items-start gap-2 text-yellow-200">
                            <span className="text-yellow-400">★</span> First to win takes the vault!
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500/50">•</span> 25 sec start • 25 sec max
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500/50">•</span> +1s/move (if {'<'}4s)
                        </li>
                    </ul>
                    
                    <div className="pt-4 border-t border-white/5">
                        <Button className="w-full h-9 text-xs gold-btn">
                           ENTER ARENA
                        </Button>
                    </div>
                 </div>
              </Card>
           </div>

        </div>

      </div>

      {/* Footer (Added for Consistency and Rules Link) */}
      <footer className="border-t border-white/5 mt-12 py-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2 opacity-50">
                 <Crown className="h-4 w-4 text-slate-400" />
                 <span className="text-xs text-slate-500 font-orbitron tracking-widest">CHECKMATE JACKPOT</span>
               </div>
            </div>
            <div className="flex items-center gap-8">
               <button onClick={() => setView('rules')} className="text-xs text-slate-500 hover:text-white uppercase tracking-wider font-tech">
                 Rules
               </button>
               <button onClick={() => setView('terms')} className="text-xs text-slate-500 hover:text-white uppercase tracking-wider font-tech">
                 Terms
               </button>
               <span className="text-xs text-slate-500 uppercase tracking-wider font-tech cursor-pointer hover:text-white">Contact</span>
            </div>
        </div>
      </footer>
    </div>
  );
};