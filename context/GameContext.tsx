import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move as ChessMove } from 'chess.js'; // Assuming chess.js is installed
import { TierLevel, TierConfig, GameState } from '../types';
import { TIERS, STARTING_FEN } from '../constants';
import { submitMove } from '../lib/supabase';

interface GameContextType {
  currentTier: TierConfig | null;
  selectTier: (tier: TierLevel) => void;
  game: Chess; // Chess.js instance
  gameState: GameState;
  whiteTime: number;
  blackTime: number;
  makeMove: (from: string, to: string) => Promise<boolean>;
  resetGame: () => void;
  playerColor: 'w' | 'b'; // Simplified: User is always white for this demo
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTier, setCurrentTier] = useState<TierConfig | null>(null);
  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [playerColor] = useState<'w' | 'b'>('w');
  
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state helper
  const updateGameState = useCallback(() => {
    setGame(new Chess(game.fen())); // Force re-render wrapper
  }, [game]);

  const selectTier = (tierId: TierLevel) => {
    const config = TIERS[tierId];
    setCurrentTier(config);
    setWhiteTime(config.timeControl.initial);
    setBlackTime(config.timeControl.initial);
    const newGame = new Chess();
    setGame(newGame);
  };

  const resetGame = () => {
    if (currentTier) {
      setWhiteTime(currentTier.timeControl.initial);
      setBlackTime(currentTier.timeControl.initial);
    }
    const newGame = new Chess();
    setGame(newGame);
    if (timerInterval.current) clearInterval(timerInterval.current);
  };

  const makeMove = async (from: string, to: string): Promise<boolean> => {
    if (!currentTier) return false;

    // 1. Optimistic Client Validation
    try {
      const moveResult = game.move({ from, to, promotion: 'q' }); // Auto promote to queen for simplicity
      if (!moveResult) return false;
      
      updateGameState();

      // 2. Handle Time Control (Increment)
      const isWhiteTurn = moveResult.color === 'w'; // The move just made was by White
      const { increment, maxCap } = currentTier.timeControl;
      
      if (isWhiteTurn) {
         setWhiteTime(prev => Math.min(prev + increment, maxCap));
      } else {
         setBlackTime(prev => Math.min(prev + increment, maxCap));
      }

      // 3. Server Validation (Tier 2 & 3)
      if (currentTier.validation === 'server') {
         // In a real app, await this. If fail, undo move.
         submitMove('game-123', { from, to }); 
      }

      // 4. Simulate Random Opponent Move (if playing vs computer stub)
      if (moveResult.color === playerColor && !game.isGameOver()) {
         setTimeout(() => {
            const moves = game.moves();
            if (moves.length > 0) {
               const randomMove = moves[Math.floor(Math.random() * moves.length)];
               game.move(randomMove);
               updateGameState();
               // Apply Black Increment
               setBlackTime(prev => Math.min(prev + increment, maxCap));
            }
         }, 500 + Math.random() * 1000); // 0.5s - 1.5s thinking time
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

    // Only run timer if game has started (history > 0)
    if (game.history().length > 0) {
      timerInterval.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => {
             if (prev <= 0.1) {
                game.setGameOver(true); // Simplified
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
    winner: game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : null, // If turn is w and checkmate, b won
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
      playerColor
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