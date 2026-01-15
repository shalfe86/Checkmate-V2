import { Chess, Move } from 'chess.js';
import { TierLevel } from '../types';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const MAX_DEPTH = 3; // Standard depth for speed/strength balance
const ENDGAME_DEPTH = 4; // Deeper search in endgame

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece Square Tables (From White's perspective)
// Higher numbers = better squares
const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k_mid: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ],
  k_end: [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
  ]
};

// Opening Book (SAN format)
const OPENING_BOOK: string[][] = [
  // Ruy Lopez
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'],
  // Sicilian
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
  // Queen's Gambit
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
  // French
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5'],
  // Caro-Kann
  ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
];

// ==========================================
// HELPERS
// ==========================================

const getSquareXY = (square: string): { x: number, y: number } => {
  const file = square.charCodeAt(0) - 97; // 'a' -> 0
  const rank = 8 - parseInt(square[1]); // '8' -> 0 (top of array)
  return { x: file, y: rank };
};

const countMaterial = (game: Chess): number => {
  let score = 0;
  const board = game.board();
  
  // Is Endgame? (No Queens or few pieces)
  const isEndgame = game.fen().split(' ')[0].toLowerCase().indexOf('q') === -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type];
      
      // Position Value
      let pstValue = 0;
      let pstTable: number[][] = [];

      switch (piece.type) {
        case 'p': pstTable = PST.p; break;
        case 'n': pstTable = PST.n; break;
        case 'b': pstTable = PST.b; break;
        case 'r': pstTable = PST.r; break;
        case 'q': pstTable = PST.q; break;
        case 'k': pstTable = isEndgame ? PST.k_end : PST.k_mid; break;
      }

      // Flip PST for Black (if we are evaluating white's board, black is at bottom rank 7)
      // Standard PSTs above are for White starting at rank 6,7 (bottom indices) moving to 0,1.
      // Array index 0 is rank 8. Array index 7 is rank 1.
      // If piece is white: use index r.
      // If piece is black: use index 7-r.
      // Columns are symmetric usually, but let's stick to direct mapping.
      
      const rankIdx = piece.color === 'w' ? r : 7 - r;
      // Mirror column for black to handle asymmetric tables (like King safety) correctly if needed
      // But above tables are symmetric horizontally mostly. Let's just use c.
      pstValue = pstTable[rankIdx][c];

      if (piece.color === 'w') {
        score += value + pstValue;
      } else {
        score -= (value + pstValue);
      }
    }
  }
  return score;
};

// ==========================================
// ENGINE CORE
// ==========================================

export const getBestMove = (game: Chess, tierId?: TierLevel): string | null => {
  // 1. OPENING BOOK CHECK
  const history = game.history();
  if (history.length < 10) {
    for (const line of OPENING_BOOK) {
      // Check if current history matches the start of a book line
      const isMatch = history.every((move, i) => move === line[i]);
      if (isMatch && line.length > history.length) {
         // Found a book move
         return line[history.length]; // Return next move in SAN
      }
    }
  }

  // 2. SEARCH CONFIG
  // Dynamic depth based on Tier or game phase
  let depth = MAX_DEPTH;
  if (tierId === TierLevel.TIER_1) depth = 2; // Slightly easier for practice
  
  // Endgame depth boost
  const pieceCount = game.board().flat().filter(p => p !== null).length;
  if (pieceCount < 12) depth = ENDGAME_DEPTH;

  // 3. MINIMAX ROOT
  const isMaximizing = game.turn() === 'w';
  
  // Generate moves (verbose for sorting)
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Optimistic Move Ordering: Captures > Promotions > Checks > Rest
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += 10 + (PIECE_VALUES[a.captured] || 0) - (PIECE_VALUES[a.piece] / 10);
    if (a.promotion) scoreA += 20;
    if (a.san.includes('+')) scoreA += 5;

    if (b.captured) scoreB += 10 + (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[b.piece] / 10);
    if (b.promotion) scoreB += 20;
    if (b.san.includes('+')) scoreB += 5;

    return scoreB - scoreA;
  });

  let bestMove = moves[0];
  let bestValue = isMaximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  // Iterate root moves
  for (const move of moves) {
    game.move(move);
    const value = minimax(game, depth - 1, alpha, beta, !isMaximizing);
    game.undo();

    if (isMaximizing) {
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestValue);
    } else {
      if (value < bestValue) {
        bestValue = value;
        bestMove = move;
      }
      beta = Math.min(beta, bestValue);
    }
    
    if (beta <= alpha) break;
  }

  // Return SAN or verbose
  return bestMove.san;
};

const minimax = (
  game: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean
): number => {
  // Base case: Depth 0 or Game Over
  if (depth === 0) {
    return evaluateBoard(game); 
    // Ideally use quiescence search here for captures, but depth 3 is usually stable enough for frontend
    // Adding simple quiescence significantly slows down JS without typed arrays optimization
  }

  if (game.isGameOver()) {
    if (game.isCheckmate()) {
       // Prefer faster mates
       return isMaximizing ? -20000 - depth : 20000 + depth;
    }
    return 0; // Draw
  }

  const moves = game.moves({ verbose: true });
  
  // Move Ordering for inner nodes (crucial for alpha-beta pruning speed)
  // Simplified sorting
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA = 10;
    if (b.captured) scoreB = 10;
    return scoreB - scoreA;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const evaluateBoard = (game: Chess): number => {
    return countMaterial(game);
};
