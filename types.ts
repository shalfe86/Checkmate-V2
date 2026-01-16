
export enum TierLevel {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export interface TimeControl {
  initial: number; // in seconds
  increment: number; // in seconds
  maxCap: number; // in seconds
}

export interface TierConfig {
  id: TierLevel;
  name: string;
  entryFee: number;
  jackpotSplit: number; // Percentage or absolute value for jackpot
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

// Add this new type
export type AppRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  country_code?: string;
  avatar_url?: string;
  role?: AppRole; 
}

export interface Wallet {
  user_id: string;
  balance: number;
  currency: string;
  monthly_earnings?: number; // For Tier 2 eligibility tracking
}