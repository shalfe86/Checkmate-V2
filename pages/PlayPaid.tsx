import React, { useEffect, useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '../lib/supabase';
import { Board } from '../components/game/Board';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Timer } from '../components/game/Timer';
import { Loader2, ShieldCheck, AlertTriangle, ArrowLeft, Activity, Flag } from 'lucide-react';
import { TIERS } from '../constants';
import { TierConfig, TierLevel } from '../types';

// Internal Toast implementation
const useInternalToast = () => {
  const [notification, setNotification] = useState<{title: string, desc: string, type: 'info' | 'error'} | null>(null);
  
  const toast = ({ title, description, variant }: { title: string, description: string, variant?: 'destructive' | 'default' }) => {
     setNotification({ title, desc: description, type: variant === 'destructive' ? 'error' : 'info' });
     setTimeout(() => setNotification(null), 3000);
  };
  
  return { toast, notification };
};

export const PlayPaid = ({ gameId, onExit }: { gameId: string, onExit: () => void }) => {
  const [game, setGame] = useState(new Chess());
  const [loading, setLoading] = useState(true);
  const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
  
  // Timer State
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast, notification } = useInternalToast();

  // 1. Initial Load
  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (data) {
        try {
            const loadedGame = new Chess(data.fen || undefined);
            setGame(loadedGame);
            
            // Set Tier Config
            if (data.tier && TIERS[data.tier as TierLevel]) {
                const config = TIERS[data.tier as TierLevel];
                setTierConfig(config);
                setWhiteTime(config.timeControl.initial);
                setBlackTime(config.timeControl.initial);
            }
        } catch (e) {
            console.error("Loaded invalid FEN:", data.fen);
        }
        setLoading(false);
      } else {
        setLoading(false);
        toast({ title: "Error", description: "Game not found", variant: "destructive" });
      }
    };
    fetchGame();
  }, [gameId]);

  // 2. Timer Logic (Client Simulation of Server Time)
  useEffect(() => {
    if (loading || !tierConfig || game.isGameOver()) {
        if (timerInterval.current) clearInterval(timerInterval.current);
        return;
    }

    if (timerInterval.current) clearInterval(timerInterval.current);

    timerInterval.current = setInterval(() => {
        if (game.turn() === 'w') {
            setWhiteTime(prev => Math.max(0, prev - 0.1));
        } else {
            setBlackTime(prev => Math.max(0, prev - 0.1));
        }
    }, 100);

    return () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [game.turn(), loading, tierConfig]);

  // 3. Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel('game_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newFen = payload.new.fen;
          try {
              // Only update if FEN is different to prevent jitter or overwriting optimistic updates
              // We check if the server FEN is actually ahead or different in a way that matters
              if (newFen !== game.fen()) {
                  // If we are currently "thinking" (optimistic move made), we might want to wait for our own move validation
                  // But usually server FEN is truth.
                  const newGame = new Chess(newFen);
                  setGame(newGame);
                  
                  // Simple increment logic for opponent (Client side viz only)
                  if (tierConfig) {
                     // If it's now White's turn, it means Black just moved, so add increment to Black
                     if (newGame.turn() === 'w') {
                        setBlackTime(t => Math.min(t + tierConfig.timeControl.increment, tierConfig.timeControl.maxCap));
                     }
                  }

                  if (newGame.isGameOver()) {
                     toast({ title: "Game Over", description: "Match concluded." });
                  }
              }
          } catch(e) {
              console.error("Realtime update error", e);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, game, tierConfig]);

  // Prevent accidental back/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault(); 
      e.returnValue = ''; 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 4. Make Move
  const onDrop = async (sourceSquare: string, targetSquare: string) => {
    // A. Optimistic Local Validation & Update
    const prevFen = game.fen();
    try {
      const tempGame = new Chess(prevFen);
      const move = tempGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      
      if (!move) return; // Invalid move locally, do nothing
      
      // Apply Optimistic Update
      setGame(tempGame);
      
      // Add increment for Self (White)
      if (tierConfig) {
         setWhiteTime(t => Math.min(t + tierConfig.timeControl.increment, tierConfig.timeControl.maxCap));
      }

    } catch { return; }

    // B. Send to Server (Background)
    try {
      const { data, error } = await supabase.functions.invoke('make-move', {
        body: {
          gameId: gameId,
          moveFrom: sourceSquare,
          moveTo: targetSquare,
          promotion: 'q'
        }
      });

      if (error) {
        throw new Error(error.message || "Connection failed");
      }

      if (data && !data.success) {
         throw new Error(data.error || "Move rejected by referee");
      }
      
      // Optional: Sync FEN exactly if returned
      if (data.fen && data.fen !== game.fen()) {
          setGame(new Chess(data.fen));
      }

    } catch (e: any) {
      console.error("Move Execution Error:", e);
      // Revert on Error
      setGame(new Chess(prevFen));
      toast({ variant: "destructive", title: "Action Voided", description: e.message });
    }
  };

  // 5. Handle Forfeit / Cancel
  const handleExitAction = async () => {
    const isFirstMove = game.history().length === 0;
    
    if (isFirstMove) {
        if (window.confirm("Cancel this match? No wager will be lost.")) {
            // For a 'cancelled' state, we might delete or update status. 
            // For safety with current DB schema, we'll just exit.
            onExit();
        }
    } else {
        if (window.confirm("WARNING: Forfeiting will result in a LOSS and loss of wager. Are you sure?")) {
            try {
                const { error } = await supabase
                    .from('games')
                    .update({
                        status: 'completed',
                        winner_id: 'AI_BOT' 
                    })
                    .eq('id', gameId);

                if (error) throw error;
                onExit();
            } catch (e: any) {
                toast({ variant: "destructive", title: "Error", description: e.message });
            }
        }
    }
  };

  if (loading || !tierConfig) return <div className="h-screen flex items-center justify-center text-white bg-slate-950"><Loader2 className="animate-spin mr-2"/> Secure Link Established...</div>;

  const isPlayerTurn = game.turn() === 'w'; // Assuming User is always White for now in Single Player
  const history = game.history();
  const hasMoved = history.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-20 pb-8 flex flex-col items-center relative overflow-hidden">
        
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        {/* Notification Toast */}
        {notification && (
          <div className={`absolute top-24 right-4 z-[60] px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 ${
             notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 'bg-slate-800 border-yellow-500/50 text-white'
          }`}>
             {notification.type === 'error' ? <AlertTriangle size={20} /> : <ShieldCheck size={20} className="text-yellow-500"/>}
             <div>
                <div className="font-bold text-sm font-orbitron">{notification.title}</div>
                <div className="text-xs opacity-90">{notification.desc}</div>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="w-full max-w-6xl px-4 mb-6 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleExitAction} className="text-slate-400 hover:text-white">
                    <ArrowLeft size={16} className="mr-2" />
                    {hasMoved ? "FORFEIT" : "CANCEL"}
                </Button>
                <div>
                    <h1 className="text-xl font-bold font-orbitron text-white flex items-center gap-2">
                        <Activity className="text-yellow-500" size={18} />
                        RANKED PROTOCOL
                    </h1>
                    <div className="text-xs text-slate-500 font-mono flex gap-2">
                        <span>ID: {gameId.substring(0,8)}</span>
                        <span className="text-yellow-500/50">|</span>
                        <span>{tierConfig.name}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2 rounded-lg">
                <div className={`h-2 w-2 rounded-full ${isPlayerTurn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-bold tracking-widest text-slate-300">
                    {isPlayerTurn ? "YOUR TURN" : "AI THINKING"}
                </span>
            </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-6xl px-4 relative z-10">
            
            {/* Left Panel: History */}
            <div className="hidden lg:flex flex-col w-64 h-[600px]">
                <Card className="h-full bg-slate-900/80 border-white/10 backdrop-blur-sm flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-slate-950/50">
                        <h3 className="font-orbitron text-sm text-slate-400 flex items-center gap-2">
                            <Activity size={14} /> MOVE LOG
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                        {history.length === 0 && (
                            <div className="text-slate-600 text-center mt-10 italic">Waiting for first move...</div>
                        )}
                        {history.map((move, i) => {
                            if (i % 2 === 0) {
                                return (
                                    <div key={i} className="flex items-center p-2 rounded hover:bg-white/5">
                                        <span className="text-slate-500 w-8">{(i/2 + 1)}.</span>
                                        <span className="text-white font-bold w-16">{move}</span>
                                        <span className="text-slate-400">{history[i+1] || ''}</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </Card>
            </div>

            {/* Center: Board & Timers */}
            <div className="flex-1 flex flex-col items-center">
                
                {/* Opponent Timer (AI) */}
                <div className="w-full max-w-[600px] flex justify-between items-end mb-4 px-2">
                    <div className="flex items-center gap-3 opacity-60">
                        <div className="h-10 w-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-slate-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-300">Defense System</div>
                            <div className="text-[10px] text-slate-500 uppercase">AI Level: {tierConfig.name.split(' ')[0]}</div>
                        </div>
                    </div>
                    <Timer 
                        time={blackTime} 
                        maxTime={tierConfig.timeControl.maxCap} 
                        isActive={!isPlayerTurn && !game.isGameOver()} 
                        label="AI"
                    />
                </div>

                {/* The Board */}
                <Card className="p-2 border-yellow-500/10 bg-slate-900 shadow-[0_0_100px_-20px_rgba(0,0,0,0.7)] relative group">
                    {/* Glow effect on turn */}
                    <div className={`absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-transparent blur-xl transition-opacity duration-500 ${isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
                    
                    <div className="relative z-10">
                        <Board 
                            fen={game.fen()} 
                            onMove={onDrop} 
                            orientation="white"
                        />
                    </div>
                </Card>

                {/* Player Timer (User) */}
                <div className="w-full max-w-[600px] flex justify-between items-start mt-4 px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-yellow-900/20 border border-yellow-500/50 flex items-center justify-center">
                            <span className="font-bold text-yellow-500">ME</span>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Operator</div>
                            <div className="text-[10px] text-yellow-500/80 uppercase">Challenger</div>
                        </div>
                    </div>
                    <Timer 
                        time={whiteTime} 
                        maxTime={tierConfig.timeControl.maxCap} 
                        isActive={isPlayerTurn && !game.isGameOver()} 
                        label="YOU"
                    />
                </div>
            </div>

            {/* Right Panel: (Mobile Hidden) Status/Chat Placeholder */}
            <div className="hidden xl:flex flex-col w-64 h-[600px] space-y-4">
                 <Card className="p-4 bg-slate-900/80 border-white/10">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Match Status</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Wager</span>
                            <span className="text-yellow-500 font-mono">${tierConfig.entryFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Potential</span>
                            <span className="text-green-400 font-mono">${tierConfig.jackpotSplit.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2"></div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <ShieldCheck size={12} /> Server Validated
                        </div>
                    </div>
                 </Card>

                 {/* Cancel/Forfeit Button Area */}
                 <div className="mt-auto pt-4">
                     <Button 
                        onClick={handleExitAction} 
                        variant="secondary" 
                        className={`w-full ${hasMoved ? 'hover:bg-red-900/50 hover:text-red-200 hover:border-red-500/30' : 'hover:bg-slate-800'}`}
                     >
                        {hasMoved ? (
                            <><Flag size={14} className="mr-2"/> Surrender</>
                        ) : (
                            "Cancel Match"
                        )}
                     </Button>
                     {hasMoved && (
                         <p className="text-[10px] text-red-500/50 text-center mt-2">
                             Surrendering results in immediate loss.
                         </p>
                     )}
                 </div>
            </div>

        </div>

        {/* Mobile History (Bottom) */}
        <div className="lg:hidden w-full max-w-xl px-4 mt-8">
            <div className="h-32 bg-slate-900/50 border border-white/10 rounded-lg overflow-y-auto p-2 text-xs font-mono text-slate-400">
                {history.map((m, i) => (
                    <span key={i} className="inline-block mr-2 text-slate-300">
                        {i % 2 === 0 ? `${(i/2+1)}.` : ''} {m}
                    </span>
                ))}
            </div>
        </div>

    </div>
  );
};