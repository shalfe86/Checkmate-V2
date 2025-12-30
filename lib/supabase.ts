import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // We will generate this later, but for now it's fine without

// Access environment variables using Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables');
}

// The single, shared instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to submit a move to our secure Edge Function.
 * We will build the 'validate-move' function in a later step.
 */
export const submitMove = async (gameId: string, move: { from: string; to: string; promotion?: string }) => {
  const { data, error } = await supabase.functions.invoke('validate-move', {
    body: { gameId, move },
  });

  if (error) {
    console.error('Edge Function Error:', error);
    return { valid: false, error: error.message };
  }

  return data; // Should return { valid: true/false, fen: string }
};