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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON body');
    }

    const { gameId, moveFrom, moveTo, promotion } = body;

    const supabaseAdmin = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) throw new Error('Game not found')

    if (game.status !== 'active') throw new Error('Game is not active')
    
    // STRICT RULE: You must be the White player to make a move via this API
    if (game.white_player_id !== user.id) throw new Error('Not your game')
    
    const chess = new Chess(game.fen)
    
    // Ensure it's white's turn (User is white)
    if (chess.turn() !== 'w') throw new Error('Not your turn')

    try {
      const move = chess.move({ from: moveFrom, to: moveTo, promotion: promotion || 'q' })
      if (!move) throw new Error('Invalid move')
    } catch (e) {
      throw new Error('Illegal move attempted')
    }

    // Check for Win/Loss after User Move
    if (chess.isGameOver()) {
       const isWin = chess.isCheckmate() && chess.turn() === 'b'; // White mated Black
       
       await supabaseAdmin
        .from('games')
        .update({ 
          fen: chess.fen(), 
          pgn: chess.pgn(), 
          status: 'completed',
          winner_id: isWin ? user.id : null 
        })
        .eq('id', gameId)

      return new Response(JSON.stringify({ success: true, gameOver: true, fen: chess.fen() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // AI Response (Instant)
    const aiMove = getBestMove(chess);
    if (aiMove) {
      chess.move(aiMove);
    }

    // Check for Win/Loss after AI Move
    const aiWin = chess.isCheckmate() && chess.turn() === 'w'; // Black mated White

    // Update DB
    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update({ 
        fen: chess.fen(), 
        pgn: chess.pgn(),
        status: chess.isGameOver() ? 'completed' : 'active',
        winner_id: aiWin ? 'AI_BOT' : null 
      })
      .eq('id', gameId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, fen: chess.fen() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Move Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})