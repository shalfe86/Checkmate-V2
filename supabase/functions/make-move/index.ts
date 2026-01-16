import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Chess } from "https://esm.sh/chess.js@1.0.0-beta.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function getBestMove(game: Chess): string | null {
  const moves = game.moves();
  if (moves.length === 0) return null;
  // Simple AI: Capture high value pieces
  let bestMove = moves[0];
  let bestValue = -Infinity;
  for (const move of moves) {
    game.move(move);
    let score = 0;
    const board = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const val = PIECE_VALUES[piece.type] || 0;
          score += piece.color === 'b' ? val : -val; 
        }
      }
    }
    game.undo();
    if (score > bestValue) {
      bestValue = score;
      bestMove = move;
    }
  }
  return bestMove;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // 1. Setup Clients
    const supabaseClient = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Parse Request (Look for 'action')
    const { gameId, action, moveFrom, moveTo, promotion } = await req.json();

    const supabaseAdmin = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // 3. Fetch Game
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');
    if (game.white_player_id !== user.id) throw new Error('Not your game');

    // --- NEW: HANDLE RESIGN/TIMEOUT ---
    
    if (action === 'resign') {
        await supabaseAdmin.from('games').update({ 
            status: 'completed', 
            winner_id: 'AI_BOT', // User resigned, Bot wins
            end_reason: 'resignation'
        }).eq('id', gameId);
        
        return new Response(JSON.stringify({ success: true, status: 'resigned' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (action === 'timeout') {
        await supabaseAdmin.from('games').update({ 
            status: 'completed', 
            winner_id: 'AI_BOT', // User ran out of time
            end_reason: 'timeout'
        }).eq('id', gameId);
        
        return new Response(JSON.stringify({ success: true, status: 'timeout' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // --- STANDARD MOVE LOGIC ---
    
    const chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    else chess.load(game.fen);
    
    if (chess.turn() !== 'w') throw new Error('Not your turn');

    try {
      const move = chess.move({ from: moveFrom, to: moveTo, promotion: promotion || 'q' });
      if (!move) throw new Error('Invalid move');
    } catch (e) {
      throw new Error('Illegal move');
    }

    // Check Player Win
    if (chess.isGameOver()) {
       const isWin = chess.isCheckmate() && chess.turn() === 'b';
       await supabaseAdmin.from('games').update({ 
          fen: chess.fen(), pgn: chess.pgn(), status: 'completed', winner_id: isWin ? user.id : null 
       }).eq('id', gameId);

      return new Response(JSON.stringify({ success: true, gameOver: true, winner: isWin ? 'user' : 'draw', fen: chess.fen() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AI Turn
    const aiMove = getBestMove(chess);
    if (aiMove) chess.move(aiMove);

    // Check AI Win
    const aiWin = chess.isCheckmate() && chess.turn() === 'w';
    
    const updatePayload: any = { fen: chess.fen(), pgn: chess.pgn() };
    if (chess.isGameOver()) {
        updatePayload.status = 'completed';
        updatePayload.winner_id = aiWin ? 'AI_BOT' : null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update(updatePayload)
      .eq('id', gameId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, fen: chess.fen(), pgn: chess.pgn() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})