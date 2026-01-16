import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground'; // Assuming global type availability or library install
import { useGame } from '../../context/GameContext';
// @ts-ignore
import { Api } from 'chessground/api';
// @ts-ignore
import { Config } from 'chessground/config';
import { Chess } from 'chess.js';

interface BoardProps {
  className?: string;
}

export const Board: React.FC<BoardProps> = ({ className }) => {
  const { gameState, makeMove, playerColor } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  
  // Use a ref to always access the latest makeMove function (resolving stale closures)
  const makeMoveRef = useRef(makeMove);

  useEffect(() => {
    makeMoveRef.current = makeMove;
  }, [makeMove]);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      // Initialize Chessground
      const config: Config = {
        fen: gameState.fen,
        orientation: playerColor === 'w' ? 'white' : 'black',
        coordinates: true,
        movable: {
          color: playerColor === 'w' ? 'white' : 'black', // Strict player color restriction
          free: false,
          dests: toDests(gameState.fen), // Helper below
          events: {
            // Use the ref here so Chessground calls the fresh function, not the old captured one
            after: (orig: string, dest: string) => {
              makeMoveRef.current(orig, dest);
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
  }, []); // Only run initialization once

  // Update board when game state changes
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({
        fen: gameState.fen,
        turnColor: gameState.turn === 'w' ? 'white' : 'black',
        movable: {
          // Only allow moving pieces of the player's color, regardless of turn
          color: playerColor === 'w' ? 'white' : 'black',
          dests: toDests(gameState.fen),
        }
      });
    }
  }, [gameState.fen, gameState.turn, playerColor]);

  const containerClass = className || "w-[80vw] h-[80vw] md:w-[600px] md:h-[600px]";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative border-4 border-slate-800 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-900/50">
        <div 
          ref={boardRef} 
          className={containerClass}
          style={{ aspectRatio: '1/1' }}
        />
      </div>
    </div>
  );
};

// Helper function to calculate legal moves for Chessground
function toDests(fen: string) {
  const chess = new Chess(fen);
  const dests = new Map();
  chess.moves({ verbose: true }).forEach((m) => {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  });
  return dests;
}