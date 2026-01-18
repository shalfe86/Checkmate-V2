import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Chess } from "https://esm.sh/chess.js@1.0.0-beta.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIECE_VALUES: any = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// --- MEMORY SYSTEM ---

// 1. Fetch Bad Moves (READ)
async function getBadMoves(fen: string, supabase: any): Promise<string[]> {
  // We use the first 4 parts of FEN (Board, Turn, Castling, En Passant)
  const fenBase = fen.split(' ').slice(0, 4).join(' '); 
  
  const { data } = await supabase
    .from('ai_memory')
    .select('move_played')
    .eq('fen', fenBase);

  return data ? data.map((r: any) => r.move_played) : [];
}

// 2. Record a Loss (WRITE)
async function recordLoss(fen: string, move: string, supabase: any) {
  const fenBase = fen.split(' ').slice(0, 4).join(' ');
  
  // Try to insert. If it exists, we just ignore it (or could increment a counter)
  const { error } = await supabase.from('ai_memory').upsert(
    { fen: fenBase, move_played: move, loss_count: 1 },
    { onConflict: 'fen, move_played' }
  );
  
  if (!error) console.log(`MEMORY: Learned that ${move} is bad for ${fenBase}`);
}

// --- EVALUATION ENGINE ---

function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        let val = PIECE_VALUES[piece.type] || 0;
        score += piece.color === 'b' ? val : -val; 
      }
    }
  }
  return score;
}

function minimax(
  game: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean,
  badMoves: string[] = [] 
): [number, string | null] {
  
  if (depth === 0 || game.isGameOver()) {
    return [evaluateBoard(game), null];
  }

  const moves = game.moves();
  // Shuffle moves for variety
  moves.sort(() => Math.random() - 0.5); 

  let bestMove = moves[0];

  if (isMaximizing) { // AI (Black)
    let maxEval = -Infinity;
    for (const move of moves) {
      
      // *** MEMORY FILTER ***
      // If this move is in our "Bad List", we give it a massive penalty.
      let penalty = 0;
      if (badMoves.includes(move)) {
          penalty = -5000; // Effectively BANNED
      }

      game.move(move);
      const evalNum = minimax(game, depth - 1, alpha, beta, false)[0] + penalty;
      game.undo();
      
      if (evalNum > maxEval) {
        maxEval = evalNum;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalNum);
      if (beta <= alpha) break;
    }
    return [maxEval, bestMove];
  } else { // Player (White)
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalNum = minimax(game, depth - 1, alpha, beta, true)[0];
      game.undo();
      if (evalNum < minEval) {
        minEval = evalNum;
        bestMove = move;
      }
      beta = Math.min(beta, evalNum);
      if (beta <= alpha) break;
    }
    return [minEval, bestMove];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseClient = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { gameId, action, moveFrom, moveTo, promotion } = await req.json();

    const supabaseAdmin = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SERVICE_ROLE_KEY') ?? (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Fetch Game
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    // Handle Resign/Timeout
    if (action === 'resign' || action === 'timeout') {
        await supabaseAdmin.from('games').update({ 
            status: 'completed', winner_id: 'AI_BOT', end_reason: action 
        }).eq('id', gameId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    else chess.load(game.fen);
    
    // 1. Player Move
    try {
      const move = chess.move({ from: moveFrom, to: moveTo, promotion: promotion || 'q' });
      if (!move) throw new Error('Invalid move');
    } catch (e) {
      throw new Error('Illegal move');
    }

    // 2. CHECK IF AI LOST (User Checkmated AI)
    if (chess.isGameOver()) {
       const isUserWin = chess.isCheckmate() && chess.turn() === 'b'; 
       
       if (isUserWin) {
           // *** LEARNING TRIGGER ***
           chess.undo(); // Undo the checkmate move
           const badMove = chess.undo(); // Undo the move that caused it
           if (badMove) {
               recordLoss(chess.fen(), badMove.san, supabaseAdmin);
           }
           if (badMove) chess.move(badMove); 
           chess.move({ from: moveFrom, to: moveTo, promotion: promotion || 'q' });
       }

       await supabaseAdmin.from('games').update({ 
          fen: chess.fen(), pgn: chess.pgn(), status: 'completed', winner_id: isUserWin ? user.id : null 
       }).eq('id', gameId);
       
       return new Response(JSON.stringify({ success: true, gameOver: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 3. AI TURN
    const currentFen = chess.fen();
    
    // A. Consult Memory
    const badMoves = await getBadMoves(currentFen, supabaseAdmin);
    
    // B. Calculate Move (Depth 2 + Memory)
    const [score, bestMove] = minimax(chess, 2, -Infinity, Infinity, true, badMoves);
    
    if (bestMove) {
        chess.move(bestMove);
    } else {
        const moves = chess.moves();
        if (moves.length > 0) chess.move(moves[0]);
    }

    // 4. Update DB
    const aiWin = chess.isCheckmate() && chess.turn() === 'w';
    const updatePayload: any = { fen: chess.fen(), pgn: chess.pgn() };
    if (chess.isGameOver()) {
        updatePayload.status = 'completed';
        updatePayload.winner_id = aiWin ? 'AI_BOT' : null;
    }

    await supabaseAdmin.from('games').update(updatePayload).eq('id', gameId);

    return new Response(JSON.stringify({ success: true, fen: chess.fen(), pgn: chess.pgn() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});