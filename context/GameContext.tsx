import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { TierLevel, TierConfig, GameState } from '../types';
import { TIERS } from '../constants';
import { supabase, submitMove } from '../lib/supabase'; // Using the real client now

interface GameContextType {
  currentTier: TierConfig | null;
  selectTier: (tier: TierLevel) => Promise<void>; // Now returns a Promise
  game: Chess;
  gameState: GameState;
  whiteTime: number;
  blackTime: number;
  makeMove: (from: string, to: string) => Promise<boolean>;
  resetGame: () => void;
  playerColor: 'w' | 'b';
  gameId: string | null; // Track the server Game ID
  isLoading: boolean;    // Track network status
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTier, setCurrentTier] = useState<TierConfig | null>(null);
  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [playerColor] = useState<'w' | 'b'>('w');
  
  // New State for Real-Money Mode
  const [gameId, setGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state helper
  const updateGameState = useCallback(() => {
    setGame(new Chess(game.fen()));
  }, [game]);

  const selectTier = async (tierId: TierLevel) => {
    setIsLoading(true);
    try {
      const config = TIERS[tierId];

      // 1. Map String Enum to Integer for DB (TIER_2 -> 2)
      let dbTierId = 1;
      if (tierId === TierLevel.TIER_2) dbTierId = 2;
      if (tierId === TierLevel.TIER_3) dbTierId = 3;

      // 2. If Paid Tier, Call Server to Buy In
      if (dbTierId > 1) {
         console.log(`Attempting to join Tier ${dbTierId}...`);
         
         const { data, error } = await supabase.functions.invoke('start-game', {
            body: { tierId: dbTierId }
         });

         if (error) {
             throw new Error(error.message || 'Failed to join game');
         }

         console.log('Game Created:', data);
         setGameId(data.gameId);
         // Ensure we start with the server's FEN (though usually standard start)
         if (data.fen) {
            setGame(new Chess(data.fen));
         } else {
            setGame(new Chess());
         }
      } else {
         // Free Tier - Local Only
         setGameId(null);
         setGame(new Chess());
      }

      // 3. Setup Local State
      setCurrentTier(config);
      setWhiteTime(config.timeControl.initial);
      setBlackTime(config.timeControl.initial);
      
    } catch (err: any) {
      console.error("Buy-in failed:", err);
      alert(`Transaction Failed: ${err.message}. Please check your balance.`);
      setCurrentTier(null); // Reset selection on fail
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    // Note: In real money mode, "Reset" usually means "New Game" -> "New Buy-In"
    // For now, we just clear the board and send them back to Tier Selection
    if (timerInterval.current) clearInterval(timerInterval.current);
    setCurrentTier(null);
    setGameId(null);
    setGame(new Chess());
  };

  const makeMove = async (from: string, to: string): Promise<boolean> => {
    if (!currentTier) return false;

    try {
      // 1. Optimistic Client Validation
      const moveResult = game.move({ from, to, promotion: 'q' });
      if (!moveResult) return false;
      
      updateGameState();

      // 2. Handle Time Control
      const isWhiteTurn = moveResult.color === 'w';
      const { increment, maxCap } = currentTier.timeControl;
      
      if (isWhiteTurn) {
         setWhiteTime(prev => Math.min(prev + increment, maxCap));
      } else {
         setBlackTime(prev => Math.min(prev + increment, maxCap));
      }

      // 3. Server Validation (Tier 2 & 3)
      if (currentTier.validation === 'server' && gameId) {
         // Send move to server asynchronously
         submitMove(gameId, { from, to }); 
      }

      // 4. Simulate Bot (Temporary Stub until we build the AI Edge Function)
      if (moveResult.color === playerColor && !game.isGameOver()) {
         setTimeout(() => {
            const moves = game.moves();
            if (moves.length > 0) {
               const randomMove = moves[Math.floor(Math.random() * moves.length)];
               game.move(randomMove);
               updateGameState();
               setBlackTime(prev => Math.min(prev + increment, maxCap));
            }
         }, 500 + Math.random() * 1000);
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };

  // Timer Logic
  useEffect(() => {
    if (!currentTier || game.isGameOver()) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      return;
    }

    if (game.history().length > 0) {
      timerInterval.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => {
             if (prev <= 0.1) {
                game.setGameOver(true);
                return 0; 
             }
             return prev - 0.1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 0.1) {
                game.setGameOver(true);
                return 0;
            }
            return prev - 0.1;
          });
        }
      }, 100);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [game, currentTier]);

  const gameState: GameState = {
    fen: game.fen(),
    turn: game.turn(),
    isGameOver: game.isGameOver(),
    winner: game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : null,
    history: game.history()
  };

  return (
    <GameContext.Provider value={{
      currentTier,
      selectTier,
      game,
      gameState,
      whiteTime,
      blackTime,
      makeMove,
      resetGame,
      playerColor,
      gameId,
      isLoading
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};