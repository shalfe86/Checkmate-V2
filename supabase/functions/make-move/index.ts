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

  // Simple evaluation
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify User
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Session invalid' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { gameId, moveFrom, moveTo, promotion } = body;

    // Admin Client for DB operations
    const supabaseAdmin = createClient(
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch Game
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return new Response(JSON.stringify({ success: false, error: 'Game not found' }), {
        status: 200, // Return 200 so client sees the error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (game.status !== 'active') {
       return new Response(JSON.stringify({ success: false, error: 'Game is not active' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Strict Player Check
    if (game.white_player_id !== user.id) {
       return new Response(JSON.stringify({ success: false, error: 'Not your game' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Game Logic
    const chess = new Chess(game.fen)
    
    // Turn Check
    if (chess.turn() !== 'w') {
       return new Response(JSON.stringify({ success: false, error: 'Not your turn' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Move Validation
    try {
      const move = chess.move({ from: moveFrom, to: moveTo, promotion: promotion || 'q' })
      if (!move) throw new Error('Invalid move')
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Illegal move detected by referee' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- MOVE ACCEPTED ---

    // 1. Check for Player Win
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

      return new Response(JSON.stringify({ success: true, gameOver: true, winner: isWin ? 'user' : 'draw', fen: chess.fen() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. AI Turn (Instant)
    const aiMove = getBestMove(chess);
    if (aiMove) {
      chess.move(aiMove);
    }

    // 3. Check for AI Win
    const aiWin = chess.isCheckmate() && chess.turn() === 'w'; // Black mated White
    const isDraw = chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial();

    const updatePayload: any = {
        fen: chess.fen(), 
        pgn: chess.pgn()
    };

    if (chess.isGameOver()) {
        updatePayload.status = 'completed';
        updatePayload.winner_id = aiWin ? 'AI_BOT' : null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update(updatePayload)
      .eq('id', gameId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, fen: chess.fen() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("System Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})