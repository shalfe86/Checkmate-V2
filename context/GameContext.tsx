import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { TierLevel, TierConfig, GameState, UserProfile, Wallet } from '../types';
import { TIERS } from '../constants';
import { submitMove, supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface GameContextType {
  currentTier: TierConfig | null;
  selectTier: (tier: TierLevel) => void;
  game: Chess;
  gameState: GameState;
  whiteTime: number;
  blackTime: number;
  makeMove: (from: string, to: string) => Promise<boolean>;
  resetGame: () => void;
  playerColor: 'w' | 'b';
  user: User | null;
  profile: UserProfile | null;
  wallet: Wallet | null;
  refreshWallet: () => Promise<void>;
  logout: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  
  const [currentTier, setCurrentTier] = useState<TierConfig | null>(null);
  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [playerColor] = useState<'w' | 'b'>('w');
  
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Profile and Wallet
  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) setProfile(profileData);
      if (walletData) {
        // Mock monthly earnings for dashboard demonstration if not in DB
        setWallet({
          ...walletData,
          monthly_earnings: walletData.monthly_earnings ?? 124.50 // Mock value
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshWallet = async () => {
    if (user) {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (walletData) {
         setWallet({
          ...walletData,
          monthly_earnings: walletData.monthly_earnings ?? 124.50
        });
      }
    }
  };

  const logout = async () => {
    // 1. Optimistically clear local state immediately
    // This ensures the UI updates to "Logged Out" state instantly
    setUser(null);
    setProfile(null);
    setWallet(null);
    setCurrentTier(null);
    
    try {
      // 2. Perform the actual Supabase sign out
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if network fails, we've cleared local state, so user is effectively logged out of the UI
    }
  };

  // Auth Listener
  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      
      // Only update if different to prevent loops/thrashing
      // Note: Comparing objects directly in React state setters is tricky, 
      // but checking ID is usually sufficient for auth users.
      if (currentUser?.id !== user?.id) {
          setUser(currentUser);
      }
      
      if (currentUser) {
        if (!profile) await fetchUserData(currentUser.id);
      } else {
        // Ensure state is cleared on SIGNED_OUT event if it came from elsewhere
        // (e.g. token expiration or multi-tab signout)
        setProfile(null);
        setWallet(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, profile]); // Dependency on user/profile to avoid redundant fetches

  // Sync state helper - Clone via PGN to preserve history
  const updateGameState = useCallback(() => {
    const newGame = new Chess();
    try {
      newGame.loadPgn(game.pgn());
    } catch (e) {
      // Fallback if PGN load fails (rare), usually means empty or custom position
      newGame.load(game.fen());
    }
    setGame(newGame);
  }, [game]);

  const selectTier = (tierId: TierLevel) => {
    const config = TIERS[tierId];
    setCurrentTier(config);
    setWhiteTime(config.timeControl.initial);
    setBlackTime(config.timeControl.initial);
    const newGame = new Chess();
    setGame(newGame);
  };

  const resetGame = () => {
    if (currentTier) {
      setWhiteTime(currentTier.timeControl.initial);
      setBlackTime(currentTier.timeControl.initial);
    }
    const newGame = new Chess();
    setGame(newGame);
    if (timerInterval.current) clearInterval(timerInterval.current);
  };

  const makeMove = async (from: string, to: string): Promise<boolean> => {
    if (!currentTier) return false;

    // 1. Optimistic Client Validation
    try {
      const moveResult = game.move({ from, to, promotion: 'q' });
      if (!moveResult) return false;
      
      updateGameState();

      // 2. Handle Time Control (Increment)
      const isWhiteTurn = moveResult.color === 'w'; 
      const { increment, maxCap } = currentTier.timeControl;
      
      if (isWhiteTurn) {
         setWhiteTime(prev => Math.min(prev + increment, maxCap));
      } else {
         setBlackTime(prev => Math.min(prev + increment, maxCap));
      }

      // 3. Server Validation (Tier 2 & 3)
      if (currentTier.validation === 'server') {
         // In a real app, await this. If fail, undo move.
         submitMove('game-123', { from, to }); 
      }

      // 4. Simulate Random Opponent Move (if playing vs computer stub)
      if (moveResult.color === playerColor && !game.isGameOver()) {
         setTimeout(() => {
            const moves = game.moves();
            if (moves.length > 0) {
               const randomMove = moves[Math.floor(Math.random() * moves.length)];
               game.move(randomMove);
               updateGameState();
               // Apply Black Increment
               setBlackTime(prev => Math.min(prev + increment, maxCap));
            }
         }, 500 + Math.random() * 1000); 
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };

  // Timer Logic
  useEffect(() => {
    // Check timeout manually since we removed setGameOver
    const isTimeout = whiteTime <= 0 || blackTime <= 0;
    
    if (!currentTier || game.isGameOver() || isTimeout) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      return;
    }

    // Only run timer if game has started (history > 0)
    if (game.history().length > 0) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      
      timerInterval.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => {
             if (prev <= 0.1) return 0; // Stop at 0
             return prev - 0.1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 0.1) return 0; // Stop at 0
            return prev - 0.1;
          });
        }
      }, 100);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [game, currentTier, whiteTime, blackTime]); // Added dependencies to catch timeout

  // Calculate game state, including timeout logic
  const isTimeout = whiteTime <= 0 || blackTime <= 0;
  let winner = null;
  
  if (isTimeout) {
    winner = whiteTime <= 0 ? 'b' : 'w';
  } else if (game.isCheckmate()) {
    winner = game.turn() === 'w' ? 'b' : 'w';
  } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
    winner = 'draw';
  }

  const gameState: GameState = {
    fen: game.fen(),
    turn: game.turn(),
    isGameOver: game.isGameOver() || isTimeout,
    winner: winner as 'w' | 'b' | 'draw' | null,
    history: game.history()
  };

  return (
    <GameContext.Provider value={{
      currentTier,
      selectTier,
      game,
      gameState,
      whiteTime,
      blackTime,
      makeMove,
      resetGame,
      playerColor,
      user,
      profile,
      wallet,
      refreshWallet,
      logout
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};