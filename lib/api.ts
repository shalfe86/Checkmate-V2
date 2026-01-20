import { supabase } from './supabase';
import { TierLevel, UserProfile, Wallet } from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==========================================
// 1. USER & AUTH DATA
// ==========================================

export const getUserProfile = async (userId: string): Promise<ApiResponse<UserProfile>> => {
  try {
    // Fetch basic profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Fetch role separately (safer if roles table is strict)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      success: true,
      data: {
        ...profile,
        role: roleData?.role ?? 'user'
      }
    };
  } catch (e: any) {
    console.error('API Error [getUserProfile]:', e);
    return { success: false, error: e.message };
  }
};

export const getUserWallet = async (userId: string): Promise<ApiResponse<Wallet>> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (e: any) {
    console.error('API Error [getUserWallet]:', e);
    return { success: false, error: e.message };
  }
};

export const logDailyVisit = async (userId: string): Promise<ApiResponse> => {
  try {
    const { error } = await supabase
      .from('user_daily_visits')
      .insert({ user_id: userId }, { count: 'exact' });
      
    // Ignore duplicate key errors (PGRST116 or 23505) as that's expected behavior for unique constraints
    if (error && error.code !== '23505') throw error;

    return { success: true };
  } catch (e: any) {
    // Silent fail for analytics is acceptable
    return { success: false, error: e.message };
  }
};

// ==========================================
// 2. GAME OPERATIONS
// ==========================================

export const createGame = async (userId: string, tier: TierLevel, wager: number): Promise<ApiResponse<{ id: string }>> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .insert({
        white_player_id: userId,
        status: 'active',
        tier: tier,
        wager_amount: wager,
        is_server_game: true,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    console.error('API Error [createGame]:', e);
    return { success: false, error: e.message };
  }
};

export const getGame = async (gameId: string): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const getUserGames = async (userId: string): Promise<ApiResponse<any[]>> => {
  try {
    let allGames: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('games')
            .select('winner_id, status, created_at, tier, wager_amount')
            .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allGames = [...allGames, ...data];
            if (data.length < pageSize) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }
    return { success: true, data: allGames };
  } catch (e: any) {
    console.error('API Error [getUserGames]:', e);
    return { success: false, error: e.message };
  }
};

export const cancelGame = async (gameId: string): Promise<ApiResponse> => {
  try {
    const { error } = await supabase
      .from('games')
      .update({ status: 'cancelled' })
      .eq('id', gameId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// Edge Function Wrappers
export const makeMove = async (gameId: string, from: string, to: string, promotion: string = 'q'): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('make-move', {
      body: { 
        gameId, 
        action: 'move', // Explicit action for router in Edge Function
        moveFrom: from, 
        moveTo: to,
        promotion 
      }
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);

    return { success: true, data };
  } catch (e: any) {
    console.error('API Error [makeMove]:', e);
    return { success: false, error: e.message };
  }
};

export const claimTimeout = async (gameId: string): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('make-move', {
      body: { gameId, action: 'timeout' }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const resignGame = async (gameId: string): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('make-move', {
      body: { gameId, action: 'resign' }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// ==========================================
// 3. JACKPOTS & STATISTICS
// ==========================================

export const getJackpots = async (): Promise<ApiResponse<Record<string, number>>> => {
  try {
    const { data, error } = await supabase.from('jackpots').select('*');
    if (error) throw error;

    const map: Record<string, number> = {};
    data?.forEach((j: any) => map[j.tier] = Number(j.amount));
    
    return { success: true, data: map };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const getPlatformStats = async (): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_platform_stats');

    if (error) throw error;

    return {
      success: true,
      data: {
        activeGames: Number(data.activeGames) || 0,
        totalAccounts: Number(data.totalAccounts) || 0,
        totalGamesPlayed: Number(data.totalGamesPlayed) || 0,
        totalPayout: Number(data.totalPayout) || 0
      }
    };
  } catch (e: any) {
    console.error('API Error [getPlatformStats]:', e);
    return { 
        success: false, 
        error: e.message,
        data: { activeGames: 0, totalAccounts: 0, totalGamesPlayed: 0, totalPayout: 0 }
    };
  }
};

// ==========================================
// 4. ADMIN FEATURES
// ==========================================

/**
 * Fetches all necessary data for the admin dashboard in parallel.
 * Performs client-side joining of Profiles, Wallets, and Roles to ensure data consistency.
 */
export const getAdminDashboardData = async (): Promise<ApiResponse> => {
  try {
    // 1. Fetch Users, Wallets, Roles, Jackpots, Games (Parallel)
    const [profilesRes, walletsRes, rolesRes, jackpotsRes, gamesRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('jackpots').select('*'),
        supabase.from('games').select('id, tier, status, wager_amount, created_at, white_player_id, winner_id').order('created_at', { ascending: true })
    ]);

    const profiles = profilesRes.data || [];
    const wallets = walletsRes.data || [];
    const roles = rolesRes.data || [];
    const jackpots = jackpotsRes.data || [];
    const games = gamesRes.data || [];

    // 2. Efficient User Data Merging using Maps
    const walletMap = new Map();
    wallets.forEach(w => walletMap.set(w.user_id, Number(w.balance)));

    const roleMap = new Map();
    roles.forEach(r => roleMap.set(r.user_id, r.role));

    const users = profiles.map(u => ({
        ...u,
        balance: walletMap.has(u.id) ? walletMap.get(u.id) : 0,
        role: roleMap.get(u.id) ?? 'user'
    }));

    return {
        success: true,
        data: {
            users,
            jackpots,
            games
        }
    };
  } catch (e: any) {
    console.error('API Error [getAdminDashboardData]:', e);
    return { success: false, error: e.message };
  }
};

export const getAdminAnalytics = async (days: number = 7): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_admin_analytics', { report_days: days });
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// Legacy user fetch - consider using getAdminDashboardData instead
export const getAllUsers = async (): Promise<ApiResponse<any[]>> => {
  try {
    const res = await getAdminDashboardData();
    if (res.success && res.data) {
        return { success: true, data: res.data.users };
    }
    throw new Error(res.error);
  } catch (e: any) {
    console.error('API Error [getAllUsers]:', e);
    return { success: false, error: e.message };
  }
};