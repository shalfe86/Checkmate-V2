// ==========================================
// 1. ENUMS & CONSTANTS
// ==========================================
export enum TierLevel {
  TIER_1 = 'TIER_1', // Free
  TIER_2 = 'TIER_2', // Starter ($1)
  TIER_3 = 'TIER_3', // World ($5)
}

export type AppRole = 'admin' | 'moderator' | 'user';

export type GameStatus = 'active' | 'completed' | 'aborted' | 'cancelled';

export type TransactionType = 'deposit' | 'wager' | 'payout' | 'withdrawal' | 'bonus' | 'refund';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export type JackpotStatus = 'pending_audit' | 'paid' | 'rejected';

// ==========================================
// 2. DATABASE MODELS (Matching Tables)
// ==========================================

export interface UserProfile {
  id: string; // PK
  username: string;
  country_code?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields (for UI convenience)
  role?: AppRole; 
  balance?: number; 
  is_banned?: boolean;
}

export interface Wallet {
  user_id: string; // PK, FK -> profiles.id
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string; // PK
  user_id: string; // FK -> profiles.id
  amount: number;
  type: TransactionType;
  status?: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface Withdrawal {
  id: string; // PK
  user_id: string; // FK -> profiles.id
  amount: number;
  status: WithdrawalStatus;
  payment_method: string;
  payment_details?: any; // JSONB
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompliance {
  user_id: string; // PK, FK -> profiles.id
  is_banned: boolean;
  ban_reason?: string;
  last_ip_address?: string;
  flagged_for_review: boolean;
  last_login_country?: string;
  updated_at: string;
}

export interface JackpotPayout {
  id: string; // PK
  user_id: string; // FK -> profiles.id
  game_id?: string; // FK -> games.id
  tier: TierLevel; // FK -> jackpots.tier
  amount: number;
  status: JackpotStatus;
  created_at: string;
  processed_at?: string;
}

// ==========================================
// 3. GAME LOGIC TYPES
// ==========================================

export interface TimeControl {
  initial: number; // seconds
  increment: number; // seconds
  maxCap: number; // seconds
}

export interface TierConfig {
  id: TierLevel;
  name: string;
  entryFee: number;
  jackpotSplit: number; 
  houseSplit: number;
  timeControl: TimeControl;
  validation: 'client' | 'server';
  hasAds: boolean;
  description: string;
}

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isGameOver: boolean;
  winner: 'w' | 'b' | 'draw' | null;
  history: string[];
}

export interface Move {
  from: string;
  to: string;
  promotion?: string;
}

// Matching the 'games' table
export interface GameRecord {
  id: string; // PK
  white_player_id: string; // FK -> profiles.id
  black_player_id?: string; // FK -> profiles.id
  status: GameStatus;
  fen: string;
  pgn: string;
  winner_id?: string; // FK -> profiles.id
  wager_amount: number;
  is_server_game: boolean;
  tier: TierLevel; // FK -> jackpots.tier
  end_reason?: string;
  created_at: string;
  updated_at: string;
  last_move_at?: string;
  white_time?: number;
  black_time?: number;
}