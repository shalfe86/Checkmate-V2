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
    // Call the secure database function (RPC)
    // This is instant because the database does the math, not the browser.
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
    // Return zeros on error to prevent UI crash
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
 * NEW: Fetches the aggregated admin dashboard data in one secure server call.
 * Bypasses RLS to show all user balances and game stats.
 */
export const getAdminDashboardData = async (): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_admin_dashboard_data');
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// Legacy analytics call (kept for backward compatibility if needed)
export const getAdminAnalytics = async (days: number = 7): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_admin_analytics', { report_days: days });
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// Legacy user fetch (This is likely restricted by RLS for non-admins)
// Use getAdminDashboardData() instead for full lists.
export const getAllUsers = async (): Promise<ApiResponse<any[]>> => {
  try {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const { data: wallets } = await supabase.from('wallets').select('*');

    if (!profiles) return { success: true, data: [] };

    const mergedUsers = profiles.map(profile => {
        const userRoleEntry = roles?.find(r => r.user_id === profile.id);
        const userWallet = wallets?.find(w => w.user_id === profile.id);
        return {
            ...profile,
            role: userRoleEntry ? userRoleEntry.role : 'user',
            balance: userWallet ? userWallet.balance : 0,
            wallet_id: userWallet ? userWallet.id : null
        };
    });

    return { success: true, data: mergedUsers };
  } catch (e: any) {
    console.error('API Error [getAllUsers]:', e);
    return { success: false, error: e.message };
  }
};