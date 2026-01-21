import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { TierLevel, TierConfig, GameState, UserProfile, Wallet } from '../types';
import { TIERS } from '../constants';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { getBestMove } from '../lib/engine';
import * as api from '../lib/api';

type AppView = 'lobby' | 'rules' | 'terms' | 'admin';

interface GameContextType {
  currentTier: TierConfig | null;
  selectTier: (tier: TierLevel) => void;
  activeGameId: string | null;
  enterGame: (gameId: string) => void;
  exitGame: () => void;
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
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  
  const [currentTier, setCurrentTier] = useState<TierConfig | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [playerColor] = useState<'w' | 'b'>('w');
  
  const [currentView, setCurrentView] = useState<AppView>('lobby');
  
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed Admin Status (Strict Server Check)
  const isAdmin = profile?.role === 'admin';

  // Fetch Profile, Wallet, AND Roles using Centralized API
  const fetchUserData = async (userId: string, isInitialLoad: boolean = false) => {
    try {
      // 0. Log Visit (Fire and forget via API)
      api.logDailyVisit(userId);

      // 1. Fetch Profile & Role
      const profileResponse = await api.getUserProfile(userId);
      
      if (profileResponse.success && profileResponse.data) {
        const userProfile = profileResponse.data;
        setProfile(userProfile);

        // Auto-redirect admin on login
        if (isInitialLoad && userProfile.role === 'admin') {
           setCurrentView('admin');
        }
      }
      
      // 2. Fetch Wallet
      const walletResponse = await api.getUserWallet(userId);

      if (walletResponse.success && walletResponse.data) {
         setWallet(walletResponse.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshWallet = async () => {
    if (user) await fetchUserData(user.id, false);
  };

  const logout = async () => {
    // 1. Optimistically clear local state
    setUser(null);
    setProfile(null);
    setWallet(null);
    setCurrentTier(null);
    setActiveGameId(null);
    setCurrentView('lobby');
    
    // 2. Perform server sign out
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Auth Listener
  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            setUser(session.user);
            fetchUserData(session.user.id, true);
        }
    });

    // Real-time Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      
      if (event === 'SIGNED_OUT' || !currentUser) {
          setUser(null);
          setProfile(null);
          setWallet(null);
          setCurrentView('lobby');
      } else if (currentUser.id !== user?.id) {
          setUser(currentUser);
          // Small delay to allow database triggers to initialize profile if new user
          setTimeout(() => fetchUserData(currentUser.id, true), 500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

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
    setActiveGameId(null);
  };

  const enterGame = (gameId: string) => {
    setActiveGameId(gameId);
    setCurrentTier(null);
  };

  const exitGame = () => {
    setActiveGameId(null);
    setCurrentTier(null);
    refreshWallet();
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

      // 3. Trigger AI Move (Client Side Only)
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
      activeGameId,
      enterGame,
      exitGame,
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