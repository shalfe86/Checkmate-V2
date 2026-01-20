import React, { useEffect, useRef, useContext, memo } from 'react';
import { Chessground } from 'chessground'; // Assuming global type availability or library install
import { useGame, GameContext } from '../../context/GameContext';
// @ts-ignore
import { Api } from 'chessground/api';
// @ts-ignore
import { Config } from 'chessground/config';
import { Chess } from 'chess.js';

interface BoardProps {
  className?: string;
  fen?: string;
  onMove?: (from: string, to: string) => void;
  orientation?: 'white' | 'black';
}

export const Board = memo<BoardProps>(({ className, fen, onMove, orientation }) => {
  // We try to access context safely. If it's undefined (e.g. used in PlayPaid without provider), we fallback to props.
  const context = useContext(GameContext);
  const hasContext = context !== undefined;

  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  
  // Resolve effective values (Props > Context)
  const currentFen = fen ?? (hasContext ? context.gameState.fen : 'start');
  const currentOrientation = orientation ?? (hasContext ? (context.playerColor === 'w' ? 'white' : 'black') : 'white');
  const makeMoveFn = onMove ?? (hasContext ? context.makeMove : async () => false);

  // Use a ref to always access the latest makeMove function (resolving stale closures)
  const makeMoveRef = useRef(makeMoveFn);

  useEffect(() => {
    makeMoveRef.current = makeMoveFn;
  }, [makeMoveFn]);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      // Initialize Chessground
      const config: Config = {
        fen: currentFen,
        orientation: currentOrientation,
        coordinates: true,
        movable: {
          color: currentOrientation, // Only allow moving own pieces
          free: false,
          dests: toDests(currentFen),
          events: {
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

  // Update board when state changes
  useEffect(() => {
    if (apiRef.current) {
      const chess = new Chess(currentFen);
      const turnColor = chess.turn() === 'w' ? 'white' : 'black';
      
      apiRef.current.set({
        fen: currentFen,
        turnColor: turnColor,
        movable: {
          // Only allow moving pieces of the player's color, regardless of turn
          color: currentOrientation,
          dests: toDests(currentFen),
        }
      });
    }
  }, [currentFen, currentOrientation]);

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
}, (prevProps, nextProps) => {
    // Custom comparison function
    // Only re-render if FEN or Orientation changes. Ignore everything else.
    return prevProps.fen === nextProps.fen && prevProps.orientation === nextProps.orientation;
});

// Helper function to calculate legal moves for Chessground
function toDests(fen: string) {
  try {
    const chess = new Chess(fen);
    const dests = new Map();
    chess.moves({ verbose: true }).forEach((m) => {
      if (!dests.has(m.from)) dests.set(m.from, []);
      dests.get(m.from).push(m.to);
    });
    return dests;
  } catch (e) {
    return new Map();
  }
}