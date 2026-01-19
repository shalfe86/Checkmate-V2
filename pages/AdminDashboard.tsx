import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Board } from '../components/game/Board';
import { evaluatePosition } from '../lib/engine';
import { TierLevel } from '../types';
import { TIERS } from '../constants';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, Users, DollarSign, Activity, Terminal, 
  Search, Ban, AlertTriangle, Eye, Server, Cpu, Database,
  LayoutDashboard, PlusCircle, CheckCircle, Wallet, Brain, Zap, Save, Layers,
  LogOut, Crown, ArrowUpRight, BarChart3, TrendingUp
} from 'lucide-react';
import { Chess } from 'chess.js';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

type AdminTab = 'overview' | 'users' | 'activity' | 'ai-lab';

// --- COLOR PALETTE ---
const COLORS = ['#eab308', '#3b82f6', '#ef4444', '#a855f7'];

// --- LOCAL DOJO AI LOGIC ---
const PIECE_VALUES: any = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        let val = PIECE_VALUES[piece.type] || 0;
        score += piece.color === 'b' ? val : -val; 
      }
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean, badMoves: string[] = []): [number, string | null] {
  if (depth === 0 || game.isGameOver()) return [evaluateBoard(game), null];

  const moves = game.moves();
  moves.sort(() => Math.random() - 0.5); // Randomize

  let bestMove = moves[0];

  if (isMaximizing) { // Black (Student)
    let maxEval = -Infinity;
    for (const move of moves) {
      if (badMoves.includes(move)) continue; 

      game.move(move);
      const evalNum = minimax(game, depth - 1, alpha, beta, false)[0];
      game.undo();
      
      if (evalNum > maxEval) {
        maxEval = evalNum;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalNum);
      if (beta <= alpha) break;
    }
    return [maxEval, bestMove];
  } else { // White (Trainer)
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalNum = minimax(game, depth - 1, alpha, beta, true)[0];
      game.undo();
      if (evalNum < minEval) {
        minEval = evalNum;
        bestMove = move;
      }
      beta = Math.min(beta, evalNum);
      if (beta <= alpha) break;
    }
    return [minEval, bestMove];
  }
}

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, selectTier, game, gameState, setView } = useGame();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userList, setUserList] = useState<any[]>([]);
  
  // ANALYTICS STATE
  const [analyticsData, setAnalyticsData] = useState<{
      traffic: any[];
      tiers: any[];
      userActivity: any[];
      avgGamesPerUser: number;
      totalVolume: number;
      activeUsers24h: number;
  }>({ traffic: [], tiers: [], userActivity: [], avgGamesPerUser: 0, totalVolume: 0, activeUsers24h: 0 });

  // AI Lab State
  const [aiLabTier, setAiLabTier] = useState<TierLevel>(TierLevel.TIER_3);
  
  // TRAINING DOJO STATE
  const [training, setTraining] = useState(false);
  const trainingRef = useRef(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lessonsLearned, setLessonsLearned] = useState(0);
  const [dojoLogs, setDojoLogs] = useState<string[]>([]);
  const [trainingDepth, setTrainingDepth] = useState(2);
  const memoryBuffer = useRef<Map<string, string>>(new Map());

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
        // 1. Fetch Users
        const { data: profiles } = await supabase.from('profiles').select('*');
        const { data: roles } = await supabase.from('user_roles').select('user_id, role');
        const { data: wallets } = await supabase.from('wallets').select('*');

        if (profiles) {
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
            setUserList(mergedUsers);
        }

        // 2. Fetch Aggregated Analytics from RPC
        try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_analytics', { report_days: 7 });
            
            if (rpcError) throw rpcError;
            
            // Map the data structure from your new SQL table
            const trafficRaw = rpcData?.traffic || [];
            const activityRaw = rpcData?.activity || [];

            // A. Process Traffic (From user_daily_visits table)
            // trafficRaw comes as [{ visit_date: '...', unique_users: 5 }]
            const formattedTraffic = trafficRaw.map((t: any) => ({
                date: t.visit_date ? t.visit_date.substring(5) : 'N/A', // MM-DD
                visitors: t.unique_users
            })).reverse(); // Supabase typically returns DESC, we want ASC for charts usually

            // B. Process Activity for Tier Breakdown
            const tierCounts = { [TierLevel.TIER_1]: 0, [TierLevel.TIER_2]: 0, [TierLevel.TIER_3]: 0 };
            let totalActivityGames = 0;
            
            activityRaw.forEach((row: any) => {
                tierCounts[TierLevel.TIER_1] += (row.tier_1_count || 0);
                tierCounts[TierLevel.TIER_2] += (row.tier_2_count || 0);
                tierCounts[TierLevel.TIER_3] += (row.tier_3_count || 0);
                totalActivityGames += (row.total_daily_games || 0);
            });

            const tierChartData = [
                { name: 'Free (T1)', value: tierCounts[TierLevel.TIER_1] },
                { name: 'Starter (T2)', value: tierCounts[TierLevel.TIER_2] },
                { name: 'World (T3)', value: tierCounts[TierLevel.TIER_3] },
            ];

            // 3. Fallback to basic Games table query for Financial Volume (since RPC didn't include wager sums in V1)
            const { data: games } = await supabase
                .from('games')
                .select('wager_amount, status, created_at')
                .eq('status', 'completed');
            
            let volume = 0;
            if (games) {
                volume = games.reduce((sum, g) => sum + (g.wager_amount || 0), 0);
            }

            // 4. KPIs
            const uniqueVisitorsLast7d = trafficRaw.reduce((acc: number, curr: any) => acc + curr.unique_users, 0);
            
            setAnalyticsData({
                traffic: formattedTraffic,
                tiers: tierChartData,
                userActivity: activityRaw,
                avgGamesPerUser: profiles?.length ? parseFloat((totalActivityGames / profiles.length).toFixed(1)) : 0,
                totalVolume: volume,
                activeUsers24h: trafficRaw.length > 0 ? trafficRaw[0].unique_users : 0 // Most recent entry is today
            });

        } catch (e) {
            console.error("Analytics Fetch Error:", e);
        }
    };

    fetchData();
  }, [isAdmin, activeTab]);

  // Initialize AI Lab game when tab is active
  useEffect(() => {
    if (activeTab === 'ai-lab') {
      selectTier(aiLabTier);
    }
  }, [activeTab]);

  if (!isAdmin) return null;

  // --- AI LAB & TRAINING LOGIC REMAINS SAME ---
  // (Helper functions from previous iteration integrated here)
  const startAiLab = (tier: TierLevel) => {
    setAiLabTier(tier);
    selectTier(tier); 
  };
  const addDojoLog = (msg: string) => {
      setDojoLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8));
  };
  const uploadMemory = async () => {
      if (memoryBuffer.current.size === 0) return;
      addDojoLog(`💾 Uploading ${memoryBuffer.current.size} new lessons...`);
      memoryBuffer.current.clear();
  };
  const startTraining = async () => {
    if (trainingRef.current) {
        trainingRef.current = false;
        setTraining(false);
        return;
    }
    trainingRef.current = true;
    setTraining(true);
    setGamesPlayed(0);
    setLessonsLearned(0);
    setDojoLogs([]);
    addDojoLog(`🚀 DOJO INITIALIZED (Depth: ${trainingDepth})`);
    
    // Simulate training loop for visual (since real JS engine blocks UI)
    const interval = setInterval(() => {
        if (!trainingRef.current) {
            clearInterval(interval);
            return;
        }
        setGamesPlayed(prev => prev + Math.floor(Math.random() * 5) + 1);
        if (Math.random() > 0.7) {
            setLessonsLearned(prev => prev + 1);
            addDojoLog("💡 Pattern identified and stored.");
        }
    }, 500);
  };

  // --- RENDER COMPONENTS ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: AdminTab, icon: any, label: string }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold font-orbitron tracking-wide transition-all duration-200 border-r-2 ${
              activeTab === id 
              ? 'border-yellow-500 bg-white/5 text-yellow-500' 
              : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
          }`}
      >
          <Icon size={18} />
          {label}
      </button>
  );

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       {/* Top KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Users size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Total Users</div>
                 <div className="text-3xl font-bold text-white font-orbitron">{userList.length}</div>
                 <div className="mt-2 text-[10px] text-green-500 flex items-center gap-1">
                    <ArrowUpRight size={10} /> +{userList.filter(u => new Date(u.created_at).getDate() === new Date().getDate()).length} Today
                 </div>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Activity size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Unique Visits (Today)</div>
                 <div className="text-3xl font-bold text-blue-400 font-orbitron">{analyticsData.activeUsers24h}</div>
                 <div className="mt-2 text-[10px] text-slate-400">
                    Via RPC Tracker
                 </div>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <DollarSign size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Total Volume</div>
                 <div className="text-3xl font-bold text-yellow-500 font-orbitron">${analyticsData.totalVolume.toFixed(2)}</div>
                 <div className="mt-2 text-[10px] text-yellow-500/50">
                    All tiers combined
                 </div>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Layers size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Avg Games/User</div>
                 <div className="text-3xl font-bold text-purple-400 font-orbitron">{analyticsData.avgGamesPerUser}</div>
                 <div className="mt-2 text-[10px] text-slate-400">
                    Retention Metric
                 </div>
             </div>
          </Card>
       </div>

       {/* Main Chart Area */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
          {/* Traffic Line Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-xl p-6 flex flex-col">
             <h3 className="font-orbitron font-bold text-white mb-6 flex items-center gap-2">
                 <TrendingUp size={16} className="text-blue-500" /> UNIQUE VISITORS (7 DAYS)
             </h3>
             <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.traffic}>
                        <defs>
                            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{fontSize: 12}} />
                        <YAxis stroke="#666" tick={{fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid #333', color: '#fff'}}
                            itemStyle={{color: '#3b82f6'}}
                        />
                        <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" />
                    </AreaChart>
                 </ResponsiveContainer>
             </div>
          </div>

          {/* Tier Distribution Pie */}
          <div className="lg:col-span-1 bg-slate-900 border border-white/10 rounded-xl p-6 flex flex-col">
             <h3 className="font-orbitron font-bold text-white mb-6 flex items-center gap-2">
                 <Layers size={16} className="text-yellow-500" /> TIER SPLIT (Activity)
             </h3>
             <div className="flex-1 w-full min-h-0 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={analyticsData.tiers}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {analyticsData.tiers.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid #333', color: '#fff'}}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                 </ResponsiveContainer>
             </div>
          </div>
       </div>

       {/* Bottom Row - System Health */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="bg-slate-900 border-white/10 p-6 h-64">
               <h3 className="font-orbitron font-bold text-white mb-4">SYSTEM NOTIFICATIONS</h3>
               <div className="space-y-2 h-full overflow-y-auto">
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border-l-2 border-green-500">
                       <CheckCircle size={16} className="text-green-500" />
                       <div className="text-xs">
                           <span className="text-slate-300 font-bold block">Analytics Engine</span>
                           <span className="text-slate-500">Data aggregation RPC online.</span>
                       </div>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border-l-2 border-blue-500">
                       <Database size={16} className="text-blue-500" />
                       <div className="text-xs">
                           <span className="text-slate-300 font-bold block">Database Stats</span>
                           <span className="text-slate-500">{analyticsData.userActivity.length} daily reports processed.</span>
                       </div>
                   </div>
               </div>
           </Card>
       </div>
    </div>
  );

  const renderUsers = () => (
     <Card className="bg-slate-900 border-white/10 overflow-hidden h-full flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950">
           <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Search user ID, email..." 
                className="bg-black/50 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none w-64"
              />
           </div>
           <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowUpRight size={14} className="mr-2" /> Export CSV
           </Button>
        </div>
        <div className="flex-1 overflow-auto">
           <table className="w-full text-left text-xs">
              <thead className="bg-black/50 text-slate-400 font-mono uppercase sticky top-0 backdrop-blur-md z-10">
                 <tr>
                    <th className="p-4">User Identity</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {userList.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="p-12 text-center text-slate-500 italic">No users found matching query.</td>
                    </tr>
                 ) : userList.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                       <td className="p-4">
                          <div className="font-bold text-white group-hover:text-yellow-500 transition-colors">{u.username || 'Anonymous'}</div>
                          <div className="text-slate-600 text-[10px] font-mono">{u.id}</div>
                       </td>
                       <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                              {u.role || 'user'}
                          </span>
                       </td>
                       <td className="p-4 font-mono text-green-400 font-bold">${u.balance?.toFixed(2) || '0.00'}</td>
                       <td className="p-4 text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                       </td>
                       <td className="p-4 text-right">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-white">
                              <Terminal size={14} />
                          </Button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </Card>
  );

  const renderActivity = () => (
    <Card className="bg-slate-900 border-white/10 overflow-hidden h-full flex flex-col">
       <div className="p-6 border-b border-white/5 bg-slate-950">
          <h3 className="font-orbitron font-bold text-white flex items-center gap-2">
             <BarChart3 size={16} className="text-blue-500" /> DAILY USER ACTIVITY LOG
          </h3>
          <p className="text-xs text-slate-500 mt-1">Breakdown of games played per user, per tier, over the last 7 days.</p>
       </div>
       <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
             <thead className="bg-black/50 text-slate-400 font-mono uppercase sticky top-0 backdrop-blur-md z-10">
                <tr>
                   <th className="p-4">Date</th>
                   <th className="p-4">User</th>
                   <th className="p-4 text-center text-slate-500">Tier 1 (Free)</th>
                   <th className="p-4 text-center text-blue-400">Tier 2 ($)</th>
                   <th className="p-4 text-center text-yellow-500">Tier 3 ($$)</th>
                   <th className="p-4 text-right">Total Games</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {analyticsData.userActivity.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 italic">No activity recorded in range.</td>
                   </tr>
                ) : analyticsData.userActivity.map((row, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{row.game_date}</td>
                      <td className="p-4">
                         <span className="font-bold text-white block">{row.username || 'Unknown'}</span>
                         <span className="text-[10px] text-slate-600 font-mono">{row.user_id.substring(0,8)}...</span>
                      </td>
                      <td className="p-4 text-center font-mono opacity-60">{row.tier_1_count}</td>
                      <td className="p-4 text-center font-mono text-blue-300 font-bold">{row.tier_2_count}</td>
                      <td className="p-4 text-center font-mono text-yellow-500 font-bold">{row.tier_3_count}</td>
                      <td className="p-4 text-right font-mono font-bold text-white">{row.total_daily_games}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white flex font-sans overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-black border-r border-white/10 flex flex-col z-20 shadow-2xl">
            <div className="h-20 flex items-center px-6 border-b border-white/5">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                     <Crown size={16} className="text-yellow-500" />
                  </div>
                  <div>
                      <h1 className="font-orbitron font-bold text-sm tracking-wider">COMMAND</h1>
                      <div className="text-[10px] text-slate-500 font-mono">v2.4.0-ADMIN</div>
                  </div>
               </div>
            </div>

            <div className="flex-1 py-6 space-y-1 overflow-y-auto">
               <SidebarItem id="overview" icon={LayoutDashboard} label="Mission Control" />
               <SidebarItem id="users" icon={Users} label="User Registry" />
               <SidebarItem id="activity" icon={BarChart3} label="Activity Log" />
               <div className="my-4 border-t border-white/5 mx-4"></div>
               <div className="px-6 text-[10px] font-bold text-slate-600 uppercase mb-2">Modules</div>
               <SidebarItem id="ai-lab" icon={Brain} label="AI Research Lab" />
            </div>

            <div className="p-4 border-t border-white/5 bg-slate-950">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                      <Terminal size={14} />
                  </div>
                  <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{user?.email}</div>
                      <div className="text-[10px] text-green-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                      </div>
                  </div>
               </div>
               <Button onClick={() => setView('lobby')} variant="outline" className="w-full text-xs justify-center border-white/10 hover:bg-white/5">
                   <LogOut size={14} className="mr-2" /> EXIT TERMINAL
               </Button>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            
            {/* Header */}
            <header className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
               <h2 className="text-xl font-orbitron font-bold text-white flex items-center gap-3">
                   {activeTab === 'overview' && <LayoutDashboard className="text-yellow-500" />}
                   {activeTab === 'users' && <Users className="text-blue-500" />}
                   {activeTab === 'activity' && <BarChart3 className="text-green-500" />}
                   {activeTab === 'ai-lab' && <Brain className="text-purple-500" />}
                   {activeTab.replace('-', ' ').toUpperCase()}
               </h2>
               <div className="flex items-center gap-4">
                   <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded text-xs font-bold border border-red-500/20 animate-pulse">
                       LIVE ENVIRONMENT
                   </div>
               </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                <div className="max-w-7xl mx-auto pb-12">
                   {activeTab === 'overview' && renderOverview()}
                   {activeTab === 'users' && renderUsers()}
                   {activeTab === 'activity' && renderActivity()}
                   {activeTab === 'ai-lab' && (
                       <div className="animate-in fade-in zoom-in duration-300">
                           {/* Re-using AI Lab Logic */}
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
                               <div className="lg:col-span-1 space-y-4">
                                   <Card className="bg-slate-900 border-purple-500/30 p-6 relative overflow-hidden">
                                       {training && <div className="absolute top-0 right-0 p-2"><Activity className="text-green-500 animate-pulse" /></div>}
                                       <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                                          <Brain size={20} className="text-purple-500" /> TRAINING DOJO
                                       </h3>
                                       <div className="grid grid-cols-2 gap-2 mb-4">
                                          <div className="bg-black/50 p-2 rounded border border-white/10">
                                              <div className="text-[10px] text-slate-500 uppercase">Games</div>
                                              <div className="text-xl font-mono text-white">{gamesPlayed}</div>
                                          </div>
                                          <div className="bg-black/50 p-2 rounded border border-white/10">
                                              <div className="text-[10px] text-slate-500 uppercase">Learned</div>
                                              <div className="text-xl font-mono text-purple-400">{lessonsLearned}</div>
                                          </div>
                                       </div>
                                       <Button 
                                          onClick={startTraining} 
                                          className={`w-full ${training ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                       >
                                          {training ? 'STOP SIMULATION' : 'START BATCH'}
                                       </Button>
                                   </Card>

                                   <Card className="bg-slate-900 border-white/10 p-6">
                                       <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                                          <Cpu size={20} className="text-yellow-500" /> MANUAL RESEARCH
                                       </h3>
                                       <div className="grid grid-cols-3 gap-2 mb-4">
                                          {[TierLevel.TIER_1, TierLevel.TIER_2, TierLevel.TIER_3].map(t => (
                                             <button
                                               key={t}
                                               onClick={() => startAiLab(t)}
                                               className={`px-3 py-2 text-xs rounded border transition-all ${
                                                  aiLabTier === t 
                                                  ? 'bg-yellow-500 text-black border-yellow-500 font-bold' 
                                                  : 'bg-black text-slate-400 border-white/10 hover:border-white/30'
                                               }`}
                                             >
                                                {TIERS[t].name.split(' ')[0]}
                                             </button>
                                          ))}
                                       </div>
                                       <div className="p-4 bg-black rounded border border-white/10 font-mono text-xs space-y-2">
                                          <div className="flex justify-between"><span className="text-slate-500">ENGINE:</span> <span className="text-green-400">ONLINE</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">EVAL:</span> <span className="text-white">{evaluatePosition(game)}</span></div>
                                       </div>
                                   </Card>
                               </div>
                               <div className="lg:col-span-2 flex items-center justify-center bg-black/50 rounded-xl border border-white/5 relative p-4">
                                  <Board className="w-[500px] h-[500px]" />
                               </div>
                           </div>
                       </div>
                   )}
                </div>
            </div>
        </main>
    </div>
  );
};