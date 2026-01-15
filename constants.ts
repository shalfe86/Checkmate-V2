import { TierLevel, TierConfig } from './types';

export const TIERS: Record<TierLevel, TierConfig> = {
  [TierLevel.TIER_1]: {
    id: TierLevel.TIER_1,
    name: "Street Hustle (Free)",
    entryFee: 0,
    jackpotSplit: 0,
    houseSplit: 0,
    timeControl: {
      initial: 40,
      increment: 2,
      maxCap: 50,
    },
    validation: 'client',
    hasAds: true,
    description: "Practice your skills. No risk, no reward.",
  },
  [TierLevel.TIER_2]: {
    id: TierLevel.TIER_2,
    name: "Club Challenger",
    entryFee: 1.00,
    jackpotSplit: 5.00,
    houseSplit: 0.25,
    timeControl: {
      initial: 30,
      increment: 1,
      maxCap: 35,
    },
    validation: 'server',
    hasAds: false,
    description: "Entry level stakes. Winner takes the pot.",
  },
  [TierLevel.TIER_3]: {
    id: TierLevel.TIER_3,
    name: "Grandmaster's Vault",
    entryFee: 2.00,
    jackpotSplit: 5.00,
    houseSplit: 1.00,
    timeControl: {
      initial: 25,
      increment: 1,
      maxCap: 25,
    },
    validation: 'server',
    hasAds: false,
    description: "High velocity. High reward. Winner takes the vault.",
  }
};

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";