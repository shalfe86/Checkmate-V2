import { createClient } from '@supabase/supabase-js';
import { Move } from '../types';

// Access environment variables
const env = (import.meta as any).env || {};

// Establish credentials - prefer Env Vars, fallback to hardcoded Project Keys
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://rbgdwmofeomxtgmkdxkl.supabase.co';
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZ2R3bW9mZW9teHRnbWtkeGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDcwMTIsImV4cCI6MjA4MzcyMzAxMn0.BYq-0-OipOw_MKnYFsOeJNltMOFOVFgblEpzupHbixk';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Critical: Supabase credentials missing. App cannot connect to database.");
}

// Initialize the Supabase client with safe values
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Server-Side Function Call
export const submitMove = async (gameId: string, move: Move): Promise<{ valid: boolean; fen?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('make-move', {
      body: { 
        gameId, 
        moveFrom: move.from, 
        moveTo: move.to,
        promotion: move.promotion 
      }
    });

    if (error) throw error;
    
    return { 
      valid: true, 
      fen: data.fen 
    };
  } catch (error: any) {
    console.error('Move submission failed:', error);
    return { valid: false, error: error.message };
  }
};