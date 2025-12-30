import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS (Browser security)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Setup Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Parse Request
    const { tierId } = await req.json()
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 3. Define the Golden Rules (Financial Logic)
    // We keep this in code so we can adjust the House Edge easily
    let entryFee = 0;
    let jackpotContribution = 0;

    if (tierId === 2) {
      entryFee = 1.00;
      jackpotContribution = 0.75; // $0.25 House Edge
    } else if (tierId === 3) {
      entryFee = 2.00;
      jackpotContribution = 1.00; // $1.00 House Edge
    }
    
    // Tier 1 is free, handled on client, but we block it here just in case
    if (tierId === 1) throw new Error('Tier 1 is local only')

    // 4. Execute the Atomic Transaction
    const { data: gameId, error } = await supabaseClient.rpc('start_game_transaction', {
      p_tier_id: tierId,
      p_entry_fee: entryFee,
      p_jackpot_contribution: jackpotContribution,
      p_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Starting Position
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ gameId, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})