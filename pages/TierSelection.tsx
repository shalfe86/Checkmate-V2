import React, { useState, useEffect } from 'react';
import { TIERS } from '../constants';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { HoloPiece } from '../components/ui/HoloPiece';
import { Button } from '../components/ui/Button';
import { AuthModal } from '../components/auth/AuthModal';
import { Trophy, Clock, DollarSign, ShieldAlert, ChevronRight, Crown, FileText, Mail, Scale, Sparkles, Zap, Target, Star, Hexagon, Loader2, Wallet } from 'lucide-react';
import { TierConfig, TierLevel } from '../types';
import { supabase } from '../lib/supabase';

export const TierSelection: React.FC = () => {
  const { selectTier, enterGame, user, setView, wallet, refreshWallet } = useGame();
  const tier3 = TIERS[TierLevel.TIER_3];
  const tier2 = TIERS[TierLevel.TIER_2];
  const tier1 = TIERS[TierLevel.TIER_1];

  // Auth Modal State for Gated Access
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Loading State for Game Creation
  const [creatingGame, setCreatingGame] = useState<TierLevel | null>(null);

  // Live Jackpots State
  const [jackpots, setJackpots] = useState<Record<string, number>>({
    [TierLevel.TIER_2]: 5.00,
    [TierLevel.TIER_3]: 5.00
  });

  // Platform Stats State
  const [stats, setStats] = useState({
      activeGames: 0,
      totalAccounts: 0,
      totalGamesPlayed: 0,
      totalPayout: 0
  });

  useEffect(() => {
    const fetchPlatformStats = async () => {
        try {
            // Fetch Basic Counts
            const [
                { count: activeCount }, 
                { count: userCount }, 
                { count: completedCount },
            ] = await Promise.all([
                supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
                supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'completed')
            ]);

            // Calculate Volume with Pagination
            let totalVolume = 0;
            let page = 0;
            let hasMore = true;
            const pageSize = 1000;

            // Fetch recent chunks to approximate volume if too large, or all if feasible.
            // For now, we fetch up to 5000 records to be safe on performance, or all if less.
            while (hasMore && page < 5) {
                const { data, error } = await supabase
                    .from('games')
                    .select('wager_amount')
                    .eq('status', 'completed')
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (data && data.length > 0) {
                    const chunkSum = data.reduce((sum, game) => sum + (game.wager_amount || 0), 0);
                    totalVolume += chunkSum;
                    if (data.length < pageSize) hasMore = false;
                    else page++;
                } else {
                    hasMore = false;
                }
            }

            setStats({
                activeGames: activeCount || 0,
                totalAccounts: userCount || 0,
                totalGamesPlayed: completedCount || 0,
                totalPayout: totalVolume
            });
        } catch (e) {
            console.error("Stats fetch error", e);
        }
    };
    fetchPlatformStats();

    // --- LIVE JACKPOT SYNC ---
    const fetchJackpots = async () => {
      const { data } = await supabase.from('jackpots').select('*');
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((j: any) => map[j.tier] = Number(j.amount));
        setJackpots(prev => ({ ...prev, ...map }));
      }
    };
    fetchJackpots();

    const channel = supabase
      .channel('jackpots_public')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jackpots' }, (payload) => {
         const { tier, amount } = payload.new;
         setJackpots(prev => ({ ...prev, [tier]: Number(amount) }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Gatekeeper function
  const handleTierSelect = async (tierLevel: TierLevel) => {
    const tier = TIERS[tierLevel];
    
    // If tier has an entry fee and user is not logged in, force auth
    if (tier.entryFee > 0) {
      if (!user) {
        setAuthMode('signup'); // Default to signup for new users trying to play
        setIsAuthOpen(true);
        return;
      }

      // Check for sufficient funds
      const balance = wallet?.balance || 0;
      if (balance < tier.entryFee) {
        alert(`Insufficient funds. You need $${tier.entryFee.toFixed(2)} but only have $${balance.toFixed(2)}. Please contact an admin to top up.`);
        return;
      }
    }

    // Check validation mode
    if (tier.validation === 'server') {
        // PAID TIER: Create game on server
        setCreatingGame(tierLevel);
        try {
            const { data, error } = await supabase
                .from('games')
                .insert({
                    white_player_id: user?.id,
                    status: 'active',
                    tier: tierLevel,
                    wager_amount: tier.entryFee,
                    is_server_game: true,
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
                })
                .select()
                .single();

            if (error) throw error;
            
            // Success! The Trigger in Postgres deducted the balance.
            // Refresh wallet now to show correct amount in UI.
            await refreshWallet();

            if (data) {
                enterGame(data.id);
            }
        } catch (err: any) {
            console.error("Game Creation Error:", err);
            // Handle specific database trigger errors if possible
            if (err.message?.includes('Insufficient funds')) {
                alert("Transaction Failed: Insufficient funds in wallet.");
            } else {
                alert(`Failed to initialize match: ${err.message}`);
            }
        } finally {
            setCreatingGame(null);
        }
    } else {
        // FREE TIER: Client side
        selectTier(tierLevel);
    }
  };

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
    <>
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

        <div className="flex-1 container mx-auto px-4 z-10 pt-28 md:pt-32 pb-12 md:pb-24">
          
          {/* 2. Hero Section Typography */}
          <div className="text-center mb-10 md:mb-20 space-y-4 md:space-y-6 relative">
             <h1 className="text-5xl md:text-8xl lg:text-9xl font-black font-orbitron leading-[0.9] tracking-tighter">
               PLAY CHESS <br className="hidden md:block"/>
               <span className="text-gold-gradient relative inline-block">
                 WIN BIG
                 <span className="absolute -inset-2 bg-yellow-500/20 blur-xl opacity-50 rounded-full pointer-events-none"></span>
               </span>
             </h1>
             
             <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-lg font-tech font-light tracking-wide leading-relaxed px-4">
               Do you have what it takes to outsmart the AI?
               <span className="text-white font-medium block mt-1 md:mt-2"> Real money is on the line.</span>
             </p>
          </div>

          {/* 3. Advanced Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 max-w-7xl mx-auto">
            
            {/* TIER 3 - THE MONOLITH (Spans 8 cols) */}
            <div className="lg:col-span-8 lg:row-span-2 group perspective-1000">
               <Card 
                 enableTilt 
                 className="h-full border-yellow-500/20 bg-gradient-to-b from-[#0F0F12] to-[#050505] shadow-[0_0_60px_-15px_rgba(234,179,8,0.15)] hover:border-yellow-500/40"
               >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                  
                  <div className="flex flex-col md:flex-row h-full relative z-20">
                    <div className="p-6 md:p-12 flex-1 flex flex-col justify-between">
                       <div className="space-y-4">
                          <div className="inline-flex items-center gap-2 text-yellow-500 font-bold tracking-[0.2em] text-[10px] uppercase border border-yellow-500/30 px-3 py-1 rounded-full bg-yellow-500/5">
                            <Crown size={12} /> Championship Series
                          </div>
                          <h2 className="text-3xl md:text-5xl font-orbitron font-black text-white leading-[0.9]">
                            GRAND<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">MASTER</span>
                          </h2>
                          
                          {/* Updated Rules List */}
                          <ul className="space-y-2 text-xs text-slate-400 font-tech mt-4 border-l-2 border-yellow-500/30 pl-4">
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
                          </ul>
                       </div>

                       <div className="pt-6 md:pt-8 space-y-6 md:space-y-8">
                          <div>
                             <div className="flex items-baseline gap-2">
                               <span className="text-5xl md:text-6xl font-orbitron font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                 ${jackpots[TierLevel.TIER_3]?.toFixed(2) ?? tier3.jackpotSplit.toFixed(2)}
                               </span>
                               <span className="text-sm font-tech text-yellow-500/80 font-bold uppercase tracking-widest">USD Win</span>
                             </div>
                             <div className="h-px w-full bg-gradient-to-r from-yellow-500/50 to-transparent mt-4"></div>
                          </div>

                          <Button 
                            onClick={() => handleTierSelect(TierLevel.TIER_3)}
                            disabled={creatingGame !== null}
                            className="w-full md:w-auto gold-btn" 
                            size="lg"
                          >
                            {creatingGame === TierLevel.TIER_3 ? (
                                <><Loader2 className="animate-spin mr-2 h-4 w-4" /> INITIALIZING...</>
                            ) : (
                                user ? "INITIALIZE PROTOCOL" : "LOGIN TO PLAY"
                            )}
                          </Button>
                       </div>
                    </div>

                    {/* Hologram Container */}
                    <div className="relative w-full md:w-1/2 h-[200px] md:h-auto md:min-h-auto overflow-hidden flex items-center justify-center">
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 md:hidden"></div>
                       <div className="absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent z-10 hidden md:block"></div>
                       
                       <div className="scale-50 md:scale-100 md:translate-x-10 origin-center translate-y-4 md:translate-y-0">
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
                 className={`h-full border-blue-500/20 bg-[#0A0A0E] group relative ${creatingGame ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-blue-500/50'}`}
                 onClick={() => !creatingGame && handleTierSelect(TierLevel.TIER_2)}
               >
                  {creatingGame === TierLevel.TIER_2 && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-3xl">
                       <Loader2 className="animate-spin text-blue-400 w-8 h-8" />
                    </div>
                  )}

                  <div className="p-6 md:p-8 h-full flex flex-col justify-between relative z-10">
                     <div className="flex justify-between items-start">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                           <Target size={24} />
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Pot</span>
                          <span className="text-3xl font-bold font-orbitron text-white">
                              ${jackpots[TierLevel.TIER_2]?.toFixed(2) ?? tier2.jackpotSplit.toFixed(2)}
                          </span>
                        </div>
                     </div>
                     
                     <div className="mt-6 flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 font-orbitron">{tier2.name}</h3>
                        
                        <ul className="space-y-1 text-xs text-slate-400 font-tech mb-4">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500/50">•</span> Medium AI • $0.75 to pot
                            </li>
                            <li className="flex items-start gap-2 text-blue-200">
                                <span className="text-blue-400">★</span> Pot: $5 start → $1,000 cap
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500/50">•</span> 30 sec start • 35 sec max
                            </li>
                        </ul>

                        <div className="flex items-center justify-between text-slate-400 text-xs font-tech pt-2 border-t border-white/5">
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
                 className={`h-full border-white/10 bg-[#0A0A0E] group relative ${creatingGame ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-white/30'}`}
                 onClick={() => !creatingGame && handleTierSelect(TierLevel.TIER_1)}
               >
                  <div className="p-6 md:p-8 h-full flex flex-col justify-between relative z-10">
                     <div className="flex justify-between items-start">
                        <div className="p-3 rounded-2xl bg-slate-800 text-slate-400">
                           <Hexagon size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 bg-slate-200 px-2 py-1 rounded uppercase tracking-wider">Free Tier</span>
                     </div>
                     
                     <div className="mt-6 flex-1">
                        <h3 className="text-xl font-bold text-slate-200 mb-2 font-orbitron">{tier1.name}</h3>
                        
                        <ul className="space-y-1 text-xs text-slate-500 font-tech mb-4">
                            <li className="flex items-start gap-2">
                                <span className="text-slate-600">•</span> Unlimited free games
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-600">•</span> Beginner-friendly AI
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-600">•</span> 40 sec start • 50 sec max
                            </li>
                        </ul>

                        <div className="flex items-center justify-between text-slate-500 text-xs font-tech border-t border-white/5 pt-2">
                           <span>Practice Mode</span>
                           <span className="flex items-center gap-1 text-slate-300">40+2 Classic</span>
                        </div>
                     </div>
                  </div>
               </Card>
            </div>

          </div>

          {/* 4. Stats Ribbon (Updated with real platform data) */}
          <div className="mt-12 md:mt-32 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
              <div className="container mx-auto max-w-7xl">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
                  {[
                    { label: 'Total Matches', value: stats.totalGamesPlayed.toLocaleString() },
                    { label: 'Total Volume', value: `$${stats.totalPayout.toFixed(2)}` }, 
                    { label: 'Active Games', value: stats.activeGames.toLocaleString() },
                    { label: 'Total Users', value: stats.totalAccounts.toLocaleString() },
                  ].map((stat, i) => (
                    <div key={i} className="py-6 md:py-8 text-center group cursor-default">
                       <div className="text-2xl md:text-3xl font-bold font-orbitron text-white group-hover:text-gold-gradient transition-colors duration-300">{stat.value}</div>
                       <div className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-2 font-tech">{stat.label}</div>
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
               <p className="text-[10px] text-slate-600 max-w-xs text-center md:text-left">
                 Decentralized skill-gaming protocol. All rights reserved {new Date().getFullYear()}.
               </p>
            </div>
            
            <div className="flex items-center gap-8">
               <button onClick={() => setView('rules')} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
                 Rules
               </button>
               <button onClick={() => setView('terms')} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
                 Terms
               </button>
               <a href="#" className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-tech">
                 Contact
               </a>
            </div>
          </div>
        </footer>

      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        defaultMode={authMode}
      />
    </>
  );
};