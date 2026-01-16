import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '../lib/supabase';
import { Board } from '../components/game/Board';
import { Card } from '../components/ui/Card';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

// Internal Toast implementation to replace missing component
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
        } catch (e) {
            console.error("Loaded invalid FEN:", data.fen);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  // 2. Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel('game_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newFen = payload.new.fen;
          try {
              const newGame = new Chess(newFen);
              setGame(newGame);
              if (newGame.isGameOver()) {
                 toast({ title: "Game Over!", description: "Check your dashboard for the results." });
              }
          } catch(e) {
              console.error("Realtime update error", e);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  // Prevent accidental back/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault(); 
      e.returnValue = ''; // Standard legacy support
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 3. Make Move
  const onDrop = async (sourceSquare: string, targetSquare: string) => {
    // A. Optimistic Check
    try {
      const tempGame = new Chess(game.fen());
      const move = tempGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!move) return;
    } catch { return; }

    toast({ title: "Verifying...", description: "Sending move to referee.", variant: 'default' });

    try {
      const { data, error } = await supabase.functions.invoke('make-move', {
        body: {
          gameId: gameId,
          moveFrom: sourceSquare,
          moveTo: targetSquare,
          promotion: 'q'
        }
      });

      if (error || (data && !data.success)) {
        const msg = error?.message || data?.error || "Invalid Move";
        toast({ variant: "destructive", title: "Referee says NO", description: msg });
        
        // Revert board
        const resetGame = new Chess(game.fen());
        setGame(resetGame);
        return;
      }
      
      // If server returns new FEN immediately, use it
      if (data.fen) {
          setGame(new Chess(data.fen));
      }

    } catch (e: any) {
      console.error("Execution Error:", e);
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
  };

  // 4. Handle Forfeit
  const handleForfeit = async () => {
    if (!window.confirm("Are you sure you want to forfeit? You will lose this game and your wager.")) {
      return;
    }

    toast({ title: "Forfeiting...", description: "Processing resignation." });

    try {
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: 'AI_BOT', // In this mode, leaving means the bot wins
          // end_reason: 'resignation' // assuming db supports this or redundant
        })
        .eq('id', gameId);

      if (error) throw error;
      
      onExit();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Loading Arena...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 flex flex-col items-center relative">
        {notification && (
          <div className={`absolute top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
             notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 'bg-slate-800 border-yellow-500/50 text-white'
          }`}>
             {notification.type === 'error' ? <AlertTriangle size={20} /> : <ShieldCheck size={20} className="text-yellow-500"/>}
             <div>
                <div className="font-bold text-sm font-orbitron">{notification.title}</div>
                <div className="text-xs opacity-90">{notification.desc}</div>
             </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 text-yellow-500 font-orbitron">
            <ShieldCheck size={24} />
            <h1 className="text-2xl font-bold">RANKED MATCH</h1>
        </div>
        
        <Card className="p-1 border-yellow-500/20 bg-slate-900 shadow-[0_0_50px_-10px_rgba(234,179,8,0.2)]">
            <Board 
                fen={game.fen()} 
                onMove={onDrop} 
                orientation="white"
            />
        </Card>

        <div className="mt-8">
            <button onClick={handleForfeit} className="text-slate-500 hover:text-red-500 text-xs uppercase tracking-widest transition-colors flex items-center gap-2">
                <AlertTriangle size={12} />
                Forfeit & Exit
            </button>
        </div>
    </div>
  );
};