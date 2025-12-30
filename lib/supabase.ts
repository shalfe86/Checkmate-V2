import { createClient } from '@supabase/supabase-js';
import { Move } from '../types';

// Access environment variables using Vite's import.meta.env
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'mock-key';

// Initialize the real Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mock Server-Side Function (Edge Function Stub)
export const submitMove = async (gameId: string, move: Move): Promise<{ valid: boolean; fen?: string; error?: string }> => {
  console.log(`[Server Stub] Validating move for Game ${gameId}: ${move.from} -> ${move.to}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300));

  // In a real app, we would validate against server-stored FEN
  // For this stub, we return true to let the client optimistic UI proceed
  return { valid: true };
};