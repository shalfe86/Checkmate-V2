import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground'; // Assuming global type availability or library install
import { useGame } from '../../context/GameContext';
// @ts-ignore
import { Api } from 'chessground/api';
// @ts-ignore
import { Config } from 'chessground/config';

export const Board: React.FC = () => {
  const { gameState, makeMove, playerColor, currentTier } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      // Initialize Chessground
      const config: Config = {
        fen: gameState.fen,
        orientation: playerColor === 'w' ? 'white' : 'black',
        coordinates: true,
        movable: {
          color: 'white', // Only allow moving own pieces (simplified)
          free: false,
          dests: toDests(gameState.fen), // Helper below
          events: {
            after: (orig: string, dest: string) => {
              makeMove(orig, dest);
            },
          },
        },
        drawable: {
           enabled: true,
           visible: true,
           defaultSnapToValidMove: true
        },
        highlight: {
          lastMove: true,
          check: true,
        },
      };
      
      apiRef.current = Chessground(boardRef.current, config);
    }
  }, []);

  // Update board when game state changes
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({
        fen: gameState.fen,
        turnColor: gameState.turn === 'w' ? 'white' : 'black',
        movable: {
          color: gameState.turn === 'w' ? 'white' : 'black',
          dests: toDests(gameState.fen),
        }
      });
    }
  }, [gameState.fen, gameState.turn]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative border-4 border-slate-800 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-900/50">
        <div 
          ref={boardRef} 
          style={{ width: '100%', maxWidth: '600px', height: '600px', aspectRatio: '1/1' }} 
          className="w-[80vw] h-[80vw] md:w-[600px] md:h-[600px]"
        />
        
        {/* Tier Overlay (if applicable) */}
        {currentTier && (
          <div className="absolute top-2 right-2 pointer-events-none">
             <span className="bg-slate-950/80 border border-yellow-500/30 text-yellow-500 text-xs px-2 py-1 rounded backdrop-blur-sm font-orbitron">
               {currentTier.name.split(' ')[0]} MODE
             </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate legal moves for Chessground
import { Chess } from 'chess.js';

function toDests(fen: string) {
  const chess = new Chess(fen);
  const dests = new Map();
  chess.moves({ verbose: true }).forEach((m) => {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  });
  return dests;
}