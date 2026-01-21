import { supabase } from './supabase';
import { TierLevel, UserProfile, Wallet, GameRecord, JackpotPayout, Transaction, UserCompliance } from '../types';

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
    // 1. Fetch basic profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // 2. Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. Fetch compliance status
    const { data: complianceData } = await supabase
      .from('user_compliance')
      .select('is_banned')
      .eq('user_id', userId)
      .maybeSingle();
      
    // 4. Fetch Wallet for convenience
    const { data: walletData } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      success: true,
      data: {
        ...profile,
        role: roleData?.role ?? 'user',
        is_banned: complianceData?.is_banned ?? false,
        balance: walletData?.balance ?? 0
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

export const getUserCompliance = async (userId: string): Promise<ApiResponse<UserCompliance>> => {
  try {
    const { data, error } = await supabase
      .from('user_compliance')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const logDailyVisit = async (userId: string): Promise<ApiResponse> => {
  try {
    const { error } = await supabase
      .from('user_daily_visits')
      .insert({ user_id: userId, visit_date: new Date().toISOString() });
      
    // Ignore duplicate key errors (PGRST116 or 23505)
    if (error && error.code !== '23505') throw error;

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const getUserPayouts = async (userId: string): Promise<ApiResponse<JackpotPayout[]>> => {
    try {
        const { data, error } = await supabase
            .from('jackpot_payouts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const getUserTransactions = async (userId: string): Promise<ApiResponse<Transaction[]>> => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (e: any) {
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

export const getGame = async (gameId: string): Promise<ApiResponse<GameRecord>> => {
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

export const getUserGames = async (userId: string): Promise<ApiResponse<GameRecord[]>> => {
  try {
    let allGames: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('games')
            .select('*')
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
        action: 'move',
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
    // Return zeros on failure
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

export interface AdminDashboardData {
    users: UserProfile[];
    jackpots: any[];
    games: GameRecord[];
    payouts: JackpotPayout[];
}

/**
 * Fetches all necessary data for the admin dashboard in parallel.
 * Performs client-side joining of Profiles, Wallets, Roles, and Compliance to ensure data consistency.
 * 
 * NOTE: This relies on RLS policies permitting the admin user to select from these tables.
 * If RLS is restrictive, this will return empty arrays for restricted tables.
 */
export const getAdminDashboardData = async (): Promise<ApiResponse<AdminDashboardData>> => {
  try {
    // 1. Fetch Users, Wallets, Roles, Jackpots, Games, Payouts, Compliance (Parallel)
    const [profilesRes, walletsRes, rolesRes, jackpotsRes, gamesRes, payoutsRes, complianceRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('jackpots').select('*'),
        supabase.from('games').select('*').order('created_at', { ascending: true }),
        supabase.from('jackpot_payouts').select('*').order('created_at', { ascending: false }),
        supabase.from('user_compliance').select('*')
    ]);

    const profiles = profilesRes.data || [];
    const wallets = walletsRes.data || [];
    const roles = rolesRes.data || [];
    const jackpots = jackpotsRes.data || [];
    const games = gamesRes.data || [];
    const payouts = payoutsRes.data || [];
    const compliance = complianceRes.data || [];

    // 2. Efficient Data Merging using Maps
    // Primary Key for joining is 'user_id' in auxiliary tables, 'id' in profiles.
    
    const walletMap = new Map();
    wallets.forEach((w: any) => walletMap.set(w.user_id, Number(w.balance)));

    const roleMap = new Map();
    roles.forEach((r: any) => roleMap.set(r.user_id, r.role));

    const complianceMap = new Map();
    compliance.forEach((c: any) => complianceMap.set(c.user_id, c.is_banned));

    const users: UserProfile[] = profiles.map((u: any) => {
        return {
            ...u,
            balance: walletMap.has(u.id) ? walletMap.get(u.id) : 0,
            role: roleMap.has(u.id) ? roleMap.get(u.id) : 'user',
            is_banned: complianceMap.has(u.id) ? complianceMap.get(u.id) : false
        };
    });

    return {
        success: true,
        data: {
            users,
            jackpots,
            games,
            payouts
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

// Legacy user fetch
export const getAllUsers = async (): Promise<ApiResponse<UserProfile[]>> => {
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