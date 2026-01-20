import React, { useEffect, useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '../lib/supabase';
import { Board } from '../components/game/Board';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Timer } from '../components/game/Timer';
import { Modal } from '../components/ui/Modal';
import { Loader2, ShieldCheck, AlertTriangle, ArrowLeft, Activity, Flag, Skull, Hourglass } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
  
  // Start Sequence State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);

  // Exit/End Game Modal States
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<'checkmate' | 'timeout' | 'resign' | 'draw' | null>(null);
  const [winner, setWinner] = useState<'user' | 'ai' | 'draw' | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'none' | 'verifying' | 'settled'>('none');

  const [showExitModal, setShowExitModal] = useState(false);
  const [exitType, setExitType] = useState<'cancel' | 'forfeit'>('cancel');

  // Timer State
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Jackpot State
  const [currentJackpot, setCurrentJackpot] = useState<number>(0);

  const { toast, notification } = useInternalToast();

  // 1. Initial Load & Jackpot Sync
  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 1000;

    const fetchGame = async () => {
      try {
          // Fetch Game Data
          const { data, error: fetchError } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

          if (fetchError || !data) {
             throw new Error(fetchError?.message || "Game data unavailable");
          }

          if (!isMounted) return;

          // Parse Game State
          try {
              const loadedGame = new Chess();
              if (data.pgn) {
                  loadedGame.loadPgn(data.pgn);
              } else if (data.fen) {
                  loadedGame.load(data.fen);
              }

              setGame(loadedGame);
              
              if (data.tier && TIERS[data.tier as TierLevel]) {
                  const config = TIERS[data.tier as TierLevel];
                  setTierConfig(config);
                  setCurrentJackpot(config.jackpotSplit); 
                  
                  // Fetch Real Jackpot
                  const { data: jackpotData } = await supabase
                      .from('jackpots')
                      .select('amount')
                      .eq('tier', data.tier)
                      .single();
                  
                  if (jackpotData) {
                      setCurrentJackpot(Number(jackpotData.amount));
                  }

                  // Subscribe to Jackpot Updates
                  const channel = supabase
                      .channel(`jackpot_game_${gameId}`)
                      .on('postgres_changes', { 
                          event: 'UPDATE', 
                          schema: 'public', 
                          table: 'jackpots',
                          filter: `tier=eq.${data.tier}`
                      }, (payload) => {
                          if (isMounted) setCurrentJackpot(Number(payload.new.amount));
                      })
                      .subscribe();

                  // Sync Server Time
                  setWhiteTime(data.white_time ?? config.timeControl.initial);
                  setBlackTime(data.black_time ?? config.timeControl.initial);
              } else {
                 throw new Error("Invalid Tier Configuration.");
              }

              // Determine Game Status
              if (loadedGame.history().length > 0) {
                  setIsGameActive(true);
              } else {
                  setCountdown(3);
                  setIsGameActive(false);
              }
              
              setLoading(false);

          } catch (parseError: any) {
              console.error("Parsing Error:", parseError);
              throw new Error("Data corruption detected.");
          }

      } catch (e: any) {
          if (attempts < MAX_RETRIES) {
              attempts++;
              setTimeout(fetchGame, RETRY_DELAY);
          } else {
              if (isMounted) {
                  setLoading(false);
                  setError(e.message || "Failed to load game session.");
                  toast({ title: "Connection Failed", description: "Could not retrieve match data.", variant: "destructive" });
              }
          }
      }
    };

    fetchGame();

    return () => { isMounted = false; };
  }, [gameId]);

  // 2. Countdown Logic
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
        const timer = setTimeout(() => {
            setCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearTimeout(timer);
    } else if (countdown === 0) {
        setIsGameActive(true);
        setCountdown(null);
        toast({ title: "START", description: "Protocol Engaged." });
    }
  }, [countdown]);

  // 3. Timer Logic
  useEffect(() => {
    if (loading || !tierConfig || game.isGameOver() || !isGameActive) {
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
  }, [game.turn(), loading, tierConfig, isGameActive]);

  // 4. Timer Expiration
  useEffect(() => {
      if (!isGameActive || game.isGameOver()) return;

      if (whiteTime <= 0) {
          handleTimeout('white');
      } else if (blackTime <= 0) {
          handleTimeout('black');
      }
  }, [whiteTime, blackTime, isGameActive]);

  const handleTimeout = async (loser: 'white' | 'black') => {
      setIsGameActive(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
      
      const isUserLoss = loser === 'white';
      
      setGameOverReason('timeout');
      setWinner(isUserLoss ? 'ai' : 'user');
      setShowGameOverModal(true);

      if (isUserLoss) {
          try {
              await supabase.functions.invoke('make-move', {
                  body: { gameId, action: 'timeout' }
              });
          } catch (e) {
              console.error("Failed to sync timeout", e);
          }
      }
  };

  // 5. Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel(`game_updates_${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newFen = payload.new.fen;
          const newPgn = payload.new.pgn;
          const status = payload.new.status;

          try {
              if (newPgn && newPgn !== game.pgn()) {
                  const newGame = new Chess();
                  newGame.loadPgn(newPgn);
                  setGame(newGame);
                  
                  if (!isGameActive && newGame.history().length > 0) {
                      setIsGameActive(true);
                      setCountdown(null);
                  }

                  // Sync Clock from DB update if available
                  if (payload.new.white_time !== undefined && payload.new.white_time !== null) {
                      setWhiteTime(payload.new.white_time);
                  }
                  if (payload.new.black_time !== undefined && payload.new.black_time !== null) {
                      setBlackTime(payload.new.black_time);
                  }
              } else if (newFen && newFen !== game.fen()) {
                  const newGame = new Chess(newFen);
                  setGame(newGame);
              }

              if (status === 'completed') {
                  setIsGameActive(false);
                  const isAiWin = payload.new.winner_id === 'AI_BOT';
                  
                  if (!isAiWin && payload.new.winner_id) {
                      // If we won, the server might still be calculating the split
                      setReviewStatus('settled');
                      setWinner('user');
                  } else {
                      setWinner(isAiWin ? 'ai' : 'draw');
                  }
                  setGameOverReason(payload.new.end_reason);
                  setShowGameOverModal(true);
              }
          } catch(e) {
              console.error("Realtime update error", e);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, game, tierConfig, isGameActive]);

  // Prevent back/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault(); 
      e.returnValue = ''; 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 6. Make Move
  const onDrop = async (sourceSquare: string, targetSquare: string) => {
    if (!isGameActive) return;

    const prevPgn = game.pgn();
    const prevFen = game.fen();

    try {
      const tempGame = new Chess();
      if (prevPgn) tempGame.loadPgn(prevPgn);
      else tempGame.load(prevFen);

      const move = tempGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!move) return; 
      
      setGame(tempGame);
      
      // Optimistic increment for UI smoothness
      if (tierConfig) {
         setWhiteTime(t => Math.min(t + tierConfig.timeControl.increment, tierConfig.timeControl.maxCap));
      }

    } catch { return; }

    try {
      const { data, error } = await supabase.functions.invoke('make-move', {
        body: {
          gameId: gameId,
          moveFrom: sourceSquare,
          moveTo: targetSquare,
          promotion: 'q'
        }
      });

      if (error) throw new Error(error.message || "Connection failed");
      if (data && !data.success) throw new Error(data.error || "Move rejected by referee");
      
      if (data.pgn) {
          const syncedGame = new Chess();
          syncedGame.loadPgn(data.pgn);
          setGame(syncedGame);

          // Force Sync Clocks from Server Response
          if (typeof data.whiteTime === 'number') setWhiteTime(data.whiteTime);
          if (typeof data.blackTime === 'number') setBlackTime(data.blackTime);
          
          if (data.gameOver) {
              setIsGameActive(false);
              
              if (data.winner === 'user') {
                  // Show "Reviewing" state immediately
                  setReviewStatus('verifying');
                  setWinner('user');
                  setShowGameOverModal(true);
              } else {
                  setWinner('ai');
                  setGameOverReason(data.reason);
                  setShowGameOverModal(true);
              }
          }
      }

    } catch (e: any) {
      console.error("Move Execution Error:", e);
      const revertGame = new Chess();
      if (prevPgn) revertGame.loadPgn(prevPgn);
      else revertGame.load(prevFen);
      
      setGame(revertGame);
      toast({ variant: "destructive", title: "Action Voided", description: e.message });
    }
  };

  // 7. Handle Forfeit / Cancel
  const handleExitAction = () => {
    const isFirstMove = game.history().length === 0;
    setExitType(isFirstMove ? 'cancel' : 'forfeit');
    setShowExitModal(true);
  };

  const confirmExit = async () => {
    setShowExitModal(false);
    
    // Safety Force Exit in case of error
    const forceExit = () => setTimeout(onExit, 500);

    if (exitType === 'cancel') {
        try {
            await supabase.from('games').update({ status: 'cancelled' }).eq('id', gameId);
        } catch (e) {
            console.warn("Cancel update failed");
        } finally {
            onExit();
        }
    } else {
        // Forfeit
        try {
            await supabase.functions.invoke('make-move', {
                body: { gameId, action: 'resign' }
            });
        } catch (e) {
            console.error("Resign Error:", e);
        } finally {
            onExit();
        }
    }
  };

  const renderGameOverContent = () => {
      if (winner === 'user') {
          if (reviewStatus === 'verifying') {
              return (
                  <div className="space-y-4">
                      <div className="text-4xl animate-pulse text-yellow-500">
                          <Hourglass size={64} className="mx-auto" />
                      </div>
                      <h2 className="text-2xl font-orbitron font-bold text-white">CHECKMATE CONFIRMED</h2>
                      <div className="text-sm text-slate-300 bg-slate-800/50 p-4 rounded-lg border border-yellow-500/20">
                          <p className="font-bold text-yellow-400 mb-2">WIN UNDER REVIEW</p>
                          <p>Verifying active matches for jackpot settlement...</p>
                          <p className="mt-2 text-xs text-slate-500">Your winnings will be deposited automatically.</p>
                      </div>
                  </div>
              );
          }
          return (
              <div className="space-y-4">
                  <div className="text-4xl animate-bounce text-green-500">
                      <ShieldCheck size={64} className="mx-auto" />
                  </div>
                  <h2 className="text-3xl font-orbitron font-bold text-white">VICTORY SECURED</h2>
                  <p className="text-slate-400">Funds transferred to wallet.</p>
              </div>
          );
      }
      return (
          <div className="space-y-4">
              <div className="text-4xl animate-pulse text-red-500">
                  <Skull size={64} className="mx-auto" />
              </div>
              <h2 className="text-3xl font-orbitron font-bold text-red-500">DEFEAT</h2>
              <p className="text-slate-400">
                  {gameOverReason === 'timeout' ? "Time Expired." : "Checkmate Executed."}
              </p>
          </div>
      );
  };

  if (error) {
     return (
         <div className="h-screen flex flex-col items-center justify-center text-white bg-slate-950 gap-6">
             <div className="bg-red-900/20 p-6 rounded-full border border-red-500/20">
                 <AlertTriangle className="h-12 w-12 text-red-500" />
             </div>
             <div className="text-center">
                 <h2 className="text-2xl font-orbitron font-bold text-white mb-2">CONNECTION FAILED</h2>
                 <p className="text-slate-400 max-w-md mx-auto">{error}</p>
                 <p className="text-xs text-slate-500 mt-2">Check your internet or contact support.</p>
             </div>
             <Button onClick={onExit} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-900/20">
                 <ArrowLeft size={16} className="mr-2" /> RETURN TO BASE
             </Button>
         </div>
     );
  }

  if (loading || !tierConfig) {
      return (
          <div className="h-screen flex flex-col items-center justify-center text-white bg-slate-950 gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-yellow-500" />
              <div className="font-orbitron tracking-widest text-sm animate-pulse">ESTABLISHING SECURE LINK...</div>
              <div className="text-xs text-slate-500">Syncing with Game Server</div>
          </div>
      );
  }

  const hasMoved = game.history().length > 0;
  // Defined to fix TypeScript errors in JSX
  const history = game.history();
  const isPlayerTurn = game.turn() === 'w';

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-20 pb-8 flex flex-col items-center relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        {countdown !== null && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                <div className="text-center">
                    <div className="text-[12rem] font-black font-orbitron text-yellow-500 animate-pulse drop-shadow-[0_0_50px_rgba(234,179,8,0.5)] leading-none">
                        {countdown}
                    </div>
                    <div className="text-xl text-white font-mono tracking-[0.5em] mt-4 uppercase">Initializing Protocol</div>
                </div>
            </div>
        )}

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
                <div className={`h-2 w-2 rounded-full ${isPlayerTurn && isGameActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-bold tracking-widest text-slate-300">
                    {isGameActive ? (isPlayerTurn ? "YOUR TURN" : "AI THINKING") : (countdown !== null ? "PREPARING" : "STANDBY")}
                </span>
            </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-6xl px-4 relative z-10">
            
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

            <div className="flex-1 flex flex-col items-center">
                
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
                        isActive={isGameActive && !isPlayerTurn && !game.isGameOver()} 
                        label="AI"
                    />
                </div>

                <Card className="p-2 border-yellow-500/10 bg-slate-900 shadow-[0_0_100px_-20px_rgba(0,0,0,0.7)] relative group">
                    <div className={`absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-transparent blur-xl transition-opacity duration-500 ${isPlayerTurn && isGameActive ? 'opacity-100' : 'opacity-0'}`}></div>
                    
                    <div className="relative z-10">
                        <Board 
                            fen={game.fen()} 
                            onMove={onDrop} 
                            orientation="white"
                        />
                    </div>
                </Card>

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
                        isActive={isGameActive && isPlayerTurn && !game.isGameOver()} 
                        label="YOU"
                    />
                </div>
            </div>

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
                            <span className="text-green-400 font-mono text-xl">${currentJackpot.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2"></div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <ShieldCheck size={12} /> Server Validated
                        </div>
                    </div>
                 </Card>

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

        <div className="lg:hidden w-full max-w-xl px-4 mt-8">
            <div className="h-32 bg-slate-900/50 border border-white/10 rounded-lg overflow-y-auto p-2 text-xs font-mono text-slate-400">
                {history.map((m, i) => (
                    <span key={i} className="inline-block mr-2 text-slate-300">
                        {i % 2 === 0 ? `${(i/2+1)}.` : ''} {m}
                    </span>
                ))}
            </div>
        </div>

        {/* Exit Confirmation Modal */}
        <Modal
            isOpen={showExitModal}
            onClose={() => setShowExitModal(false)}
            title={exitType === 'cancel' ? "CANCEL PROTOCOL" : "SURRENDER CONFIRMATION"}
            footer={
                <>
                    <Button variant="ghost" onClick={() => setShowExitModal(false)}>
                        ABORT
                    </Button>
                    <Button 
                        onClick={confirmExit} 
                        className={exitType === 'cancel' ? "bg-slate-200 text-black border-none" : "bg-red-600 text-white hover:bg-red-700 border-none"}
                    >
                        {exitType === 'cancel' ? "CONFIRM CANCEL" : "CONFIRM FORFEIT"}
                    </Button>
                </>
            }
        >
            <div className="text-center py-4 space-y-4">
                {exitType === 'cancel' ? (
                    <>
                        <div className="bg-slate-800 p-4 rounded-full inline-block">
                             <ArrowLeft size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-300">
                            Are you sure you want to cancel this match? <br/>
                            <span className="text-green-400 font-bold">No wager will be lost.</span>
                        </p>
                    </>
                ) : (
                    <>
                        <div className="bg-red-900/20 p-4 rounded-full inline-block border border-red-500/30">
                             <Flag size={32} className="text-red-500" />
                        </div>
                        <p className="text-slate-300">
                            WARNING: Surrendering will result in an immediate <span className="text-red-500 font-bold">LOSS</span>.
                            <br/>
                            Your wager will be forfeited.
                        </p>
                    </>
                )}
            </div>
        </Modal>

        {/* Game Over Modal */}
        <Modal
            isOpen={showGameOverModal}
            onClose={() => {}} 
            title="MATCH REPORT"
        >
            <div className="text-center space-y-6 py-4">
                {renderGameOverContent()}
                
                <div className="pt-4 border-t border-white/10">
                    <Button onClick={() => onExit()} className="w-full" disabled={reviewStatus === 'verifying'}>
                        {reviewStatus === 'verifying' ? "PLEASE WAIT..." : "RETURN TO BASE"}
                    </Button>
                </div>
            </div>
        </Modal>

    </div>
  );
};