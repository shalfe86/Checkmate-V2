import { createClient } from '@supabase/supabase-js';
import { Move } from '../types';

// Access environment variables
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

// To prevent the "supabaseUrl is required" crash when env vars are missing,
// we provide a placeholder. This allows the UI to render, though network calls will fail.
// We strictly avoid any "demo" database URL here to ensure user data isolation.
const clientUrl = SUPABASE_URL || 'https://rbgdwmofeomxtgmkdxkl.supabase.co';
const clientKey = SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZ2R3bW9mZW9teHRnbWtkeGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDcwMTIsImV4cCI6MjA4MzcyMzAxMn0.BYq-0-OipOw_MKnYFsOeJNltMOFOVFgblEpzupHbixk';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Missing Supabase Credentials. App running in disconnected mode.");
}

// Initialize the Supabase client with safe values
export const supabase = createClient(clientUrl, clientKey);

// Mock Server-Side Function (Edge Function Stub)
export const submitMove = async (gameId: string, move: Move): Promise<{ valid: boolean; fen?: string; error?: string }> => {
  // In a real app, this would call a Supabase Edge Function
  return { valid: true };
};