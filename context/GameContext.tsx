import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { TierLevel, TierConfig, GameState, UserProfile, Wallet } from '../types';
import { TIERS } from '../constants';
import { submitMove, supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { getBestMove } from '../lib/engine';

type AppView = 'lobby' | 'rules' | 'terms' | 'admin';

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
  currentView: AppView;
  setView: (view: AppView) => void;
  isAdmin: boolean;
  loginAsMockAdmin: () => void; // Added for mock capability
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
  
  const [currentView, setCurrentView] = useState<AppView>('lobby');
  
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed Admin Status
  const isAdmin = user?.email === 'admin@checkmate.com' || profile?.role === 'admin';

  // Fetch Profile and Wallet with error handling
  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData) {
        setProfile(profileData);
      } else {
        // Fallback for mock users
        setProfile({
            id: userId,
            username: user?.email?.split('@')[0] || 'User',
            role: user?.email === 'admin@checkmate.com' ? 'admin' : 'user'
        });
      }
      
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!walletError && walletData) {
         setWallet({
          ...walletData,
          monthly_earnings: walletData.monthly_earnings ?? 0
        });
      } else {
        // Mock wallet
        setWallet({
            user_id: userId,
            balance: 1000.00,
            currency: 'USD',
            monthly_earnings: 124.50
        });
      }
    } catch (error) {
      console.warn('Backend unavailable, using mock data');
    }
  };

  const loginAsMockAdmin = () => {
    const mockUser: User = {
        id: 'mock-admin-id',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'admin@checkmate.com',
        role: 'authenticated'
    };
    setUser(mockUser);
    setProfile({
        id: 'mock-admin-id',
        username: 'AdminCommander',
        role: 'admin',
        avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=red&color=fff'
    });
    setWallet({
        user_id: 'mock-admin-id',
        balance: 999999,
        currency: 'USD',
        monthly_earnings: 0
    });
    setCurrentView('admin');
  };

  const refreshWallet = async () => {
    if (user) await fetchUserData(user.id);
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    setWallet(null);
    setCurrentTier(null);
    setCurrentView('lobby');
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Logout warning (Supabase might be down):', error);
    }
  };

  // Auth Listener
  useEffect(() => {
    const initAuth = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                fetchUserData(session.user.id);
            }
        } catch (e) {
            console.warn("Supabase not reachable, starting in guest mode");
        }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser?.id !== user?.id) {
          setUser(currentUser);
      }
      if (currentUser) {
        // Delay slightly to ensure user object is ready
        setTimeout(() => {
             if (!profile) fetchUserData(currentUser.id);
        }, 100);
      } else {
        // Only clear if we aren't in a mock session
        if (!user || user.id !== 'mock-admin-id') {
            setProfile(null);
            setWallet(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, profile]);

  const updateGameState = useCallback(() => {
    const newGame = new Chess();
    try {
      newGame.loadPgn(game.pgn());
    } catch (e) {
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

      // 3. Server Validation (Mocked if Supabase down)
      if (currentTier.validation === 'server') {
         submitMove('game-123', { from, to }).catch(e => console.warn("Move sync failed", e));
      }

      // 4. Trigger AI Move
      if (moveResult.color === playerColor && !game.isGameOver()) {
         setTimeout(() => {
            const aiMove = getBestMove(game, currentTier.id);
            if (aiMove) {
               game.move(aiMove);
               updateGameState();
               setBlackTime(prev => Math.min(prev + increment, maxCap));
            }
         }, 50); 
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };

  // Timer Logic
  useEffect(() => {
    const isTimeout = whiteTime <= 0 || blackTime <= 0;
    
    if (!currentTier || game.isGameOver() || isTimeout) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      return;
    }

    if (game.history().length > 0) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      
      timerInterval.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => {
             if (prev <= 0.1) return 0;
             return prev - 0.1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 0.1) return 0;
            return prev - 0.1;
          });
        }
      }, 100);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [game, currentTier, whiteTime, blackTime]);

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
      logout,
      currentView,
      setView: setCurrentView,
      isAdmin,
      loginAsMockAdmin
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