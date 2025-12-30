// This is a stub for the Supabase client
import { Move } from '../types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'mock-key';

// Mock Client
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: { id: 'mock-user-123' } }, error: null }),
  },
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
  })
};

// Mock Server-Side Function (Edge Function Stub)
export const submitMove = async (gameId: string, move: Move): Promise<{ valid: boolean; fen?: string; error?: string }> => {
  console.log(`[Server Stub] Validating move for Game ${gameId}: ${move.from} -> ${move.to}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300));

  // In a real app, we would validate against server-stored FEN
  // For this stub, we return true to let the client optimistic UI proceed
  return { valid: true };
};