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
  ShieldAlert, Users, Activity, Terminal, 
  Search, Cpu, LayoutDashboard, Coins, 
  Brain, BarChart3, TrendingUp, Layers, LogOut, Crown
} from 'lucide-react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line 
} from 'recharts';

type AdminTab = 'overview' | 'users' | 'activity' | 'ai-lab';

// --- COLOR PALETTE ---
const COLORS = ['#eab308', '#3b82f6', '#ef4444', '#a855f7'];

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, selectTier, game, setView } = useGame();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userList, setUserList] = useState<any[]>([]);
  
  // ANALYTICS STATE
  const [analyticsData, setAnalyticsData] = useState<{
      traffic: any[];
      tiers: any[];
      userActivity: any[];
      totalVolume: number; // Current Active Jackpot Total
      activeUsers24h: number;
  }>({ traffic: [], tiers: [], userActivity: [], totalVolume: 0, activeUsers24h: 0 });

  // FINANCIAL STATE
  const [financials, setFinancials] = useState({
      tier2Count7d: 0,
      tier3Count7d: 0,
      tier2Earnings7d: 0,
      tier3Earnings7d: 0,
      totalEarnings7d: 0,
  });

  // AI Lab State
  const [aiLabTier, setAiLabTier] = useState<TierLevel>(TierLevel.TIER_3);
  
  // TRAINING DOJO STATE
  const [training, setTraining] = useState(false);
  const trainingRef = useRef(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lessonsLearned, setLessonsLearned] = useState(0);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
        try {
            // 1. Fetch Users, Wallets, Roles, Jackpots (Parallel)
            const [profilesRes, walletsRes, rolesRes, jackpotsRes] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('wallets').select('*'),
                supabase.from('user_roles').select('*'),
                supabase.from('jackpots').select('*')
            ]);

            const profiles = profilesRes.data || [];
            const wallets = walletsRes.data || [];
            const roles = rolesRes.data || [];
            const jackpots = jackpotsRes.data || [];

            // 2. Efficient Data Merging using Maps
            const walletMap = new Map();
            wallets.forEach(w => {
                // Ensure balance is treated as a number
                walletMap.set(w.user_id, Number(w.balance));
            });

            const roleMap = new Map();
            roles.forEach(r => {
                roleMap.set(r.user_id, r.role);
            });

            const mergedUsers = profiles.map(u => ({
                ...u,
                // Direct lookup from wallet table data
                balance: walletMap.has(u.id) ? walletMap.get(u.id) : 0,
                role: roleMap.get(u.id) ?? 'user'
            }));
            
            setUserList(mergedUsers);

            // 3. Calculate Current Active Jackpot Total (Strictly Tier 2 + Tier 3)
            const activeJackpotTotal = jackpots
                .filter(j => j.tier === 'TIER_2' || j.tier === 'TIER_3')
                .reduce((sum, j) => sum + (Number(j.amount) || 0), 0);

            // 4. Fetch ALL Completed Games for Charts/Financials
            const { data: allGames } = await supabase
                .from('games')
                .select('id, tier, status, wager_amount, created_at, white_player_id, winner_id')
                .order('created_at', { ascending: true });

            if (allGames) {
                const completedGames = allGames.filter(g => g.status === 'completed');

                // Financials (Last 7 Days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysTime = sevenDaysAgo.getTime();

                const recentCompleted = completedGames.filter(g => new Date(g.created_at).getTime() >= sevenDaysTime);
                const tier2Recent = recentCompleted.filter(g => g.tier === 'TIER_2');
                const tier3Recent = recentCompleted.filter(g => g.tier === 'TIER_3');

                const t2Profit = tier2Recent.length * 0.19;
                const t3Profit = tier3Recent.length * 0.94;

                setFinancials({
                    tier2Count7d: tier2Recent.length,
                    tier3Count7d: tier3Recent.length,
                    tier2Earnings7d: t2Profit,
                    tier3Earnings7d: t3Profit,
                    totalEarnings7d: t2Profit + t3Profit
                });

                // Analytics Charts
                const dailyStats = new Map<string, { date: string, games: number, visitors: Set<string> }>();
                for (let i=6; i>=0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().split('T')[0].substring(5); // MM-DD
                    dailyStats.set(dateStr, { date: dateStr, games: 0, visitors: new Set() });
                }

                allGames.forEach(g => {
                     const gTime = new Date(g.created_at).getTime();
                     if (gTime >= sevenDaysTime) {
                        const dateStr = new Date(g.created_at).toISOString().split('T')[0].substring(5);
                        if (dailyStats.has(dateStr)) {
                            const entry = dailyStats.get(dateStr)!;
                            entry.games += 1;
                            if (g.white_player_id) entry.visitors.add(g.white_player_id);
                        }
                     }
                });

                const chartData = Array.from(dailyStats.values()).map(d => ({
                    date: d.date,
                    visitors: d.visitors.size,
                    games: d.games
                }));

                const activityLog = [...allGames].reverse().slice(0, 50).map(g => {
                    const player = mergedUsers.find(u => u.id === g.white_player_id);
                    return {
                        id: g.id,
                        created_at: g.created_at,
                        username: player?.username || 'Unknown',
                        user_id: g.white_player_id,
                        tier: g.tier,
                        status: g.status,
                        wager: g.wager_amount,
                        winner_id: g.winner_id
                    };
                });

                const todayStr = new Date().toISOString().split('T')[0].substring(5);

                setAnalyticsData({
                    traffic: chartData,
                    tiers: [
                        { name: 'Free (T1)', value: allGames.filter(g => g.tier === 'TIER_1').length },
                        { name: 'Starter (T2)', value: allGames.filter(g => g.tier === 'TIER_2').length },
                        { name: 'World (T3)', value: allGames.filter(g => g.tier === 'TIER_3').length },
                    ],
                    userActivity: activityLog,
                    totalVolume: activeJackpotTotal, 
                    activeUsers24h: dailyStats.get(todayStr)?.visitors.size || 0
                });
            }

        } catch (e) {
            console.error("Admin Dashboard Data Fetch Error:", e);
        }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Initialize AI Lab game when tab is active
  useEffect(() => {
    if (activeTab === 'ai-lab') {
      selectTier(aiLabTier);
    }
  }, [activeTab]);

  if (!isAdmin) return null;

  // --- AI LAB LOGIC ---
  const startAiLab = (tier: TierLevel) => {
    setAiLabTier(tier);
    selectTier(tier); 
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
    
    const interval = setInterval(() => {
        if (!trainingRef.current) {
            clearInterval(interval);
            return;
        }
        setGamesPlayed(prev => prev + Math.floor(Math.random() * 5) + 1);
        if (Math.random() > 0.7) {
            setLessonsLearned(prev => prev + 1);
        }
    }, 500);
  };

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
       
       {/* Financial Report Row */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-slate-900 border-green-500/30 p-6 relative overflow-hidden group col-span-1 md:col-span-1">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Coins size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-green-400 uppercase font-mono mb-1 font-bold">Est. Net Profit (7 Days)</div>
                 <div className="text-4xl font-bold text-white font-orbitron">${financials.totalEarnings7d.toFixed(2)}</div>
                 <div className="mt-3 text-[10px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                        <span>Tier 2 ({financials.tier2Count7d}):</span>
                        <span className="text-green-400">+${financials.tier2Earnings7d.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tier 3 ({financials.tier3Count7d}):</span>
                        <span className="text-green-400">+${financials.tier3Earnings7d.toFixed(2)}</span>
                    </div>
                 </div>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Activity size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Total Active Jackpots</div>
                 <div className="text-3xl font-bold text-blue-400 font-orbitron">${analyticsData.totalVolume.toFixed(2)}</div>
                 <div className="mt-2 text-[10px] text-slate-400">
                    Current Pool Size (T2 + T3)
                 </div>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-6 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Users size={64} />
             </div>
             <div className="relative z-10">
                 <div className="text-xs text-slate-500 uppercase font-mono mb-1">Active Users (24h)</div>
                 <div className="text-3xl font-bold text-purple-400 font-orbitron">{analyticsData.activeUsers24h}</div>
                 <div className="mt-2 text-[10px] text-slate-400">
                    Unique active players today
                 </div>
             </div>
          </Card>
       </div>

       {/* Main Chart Area */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
          {/* Traffic Line Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-xl p-6 flex flex-col">
             <h3 className="font-orbitron font-bold text-white mb-6 flex items-center gap-2">
                 <TrendingUp size={16} className="text-blue-500" /> TRAFFIC & GAMES (7 DAYS)
             </h3>
             <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.traffic}>
                        <defs>
                            <linearGradient id="colorGames" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{fontSize: 12}} />
                        <YAxis stroke="#666" tick={{fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid #333', color: '#fff'}}
                            itemStyle={{color: '#eab308'}}
                        />
                        <Area type="monotone" dataKey="games" stroke="#eab308" name="Games Played" fillOpacity={1} fill="url(#colorGames)" />
                        <Line type="monotone" dataKey="visitors" stroke="#3b82f6" name="Unique Visitors" dot={false} strokeWidth={2} />
                        <Legend verticalAlign="top" height={36} />
                    </AreaChart>
                 </ResponsiveContainer>
             </div>
          </div>

          {/* Tier Distribution Pie */}
          <div className="lg:col-span-1 bg-slate-900 border border-white/10 rounded-xl p-6 flex flex-col">
             <h3 className="font-orbitron font-bold text-white mb-6 flex items-center gap-2">
                 <Layers size={16} className="text-yellow-500" /> GAME DISTRIBUTION
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
    </div>
  );

  const renderUsers = () => (
     <Card className="bg-slate-900 border-white/10 overflow-hidden h-full flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950">
           <h3 className="font-orbitron font-bold text-white">USER REGISTRY</h3>
           <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-black/50 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none w-64"
              />
           </div>
        </div>
        <div className="flex-1 overflow-auto">
           {userList.length === 0 ? (
               <div className="p-12 text-center text-slate-500 italic">
                   No users found. Check database RLS policies if you are admin.
               </div>
           ) : (
               <table className="w-full text-left text-xs">
                  <thead className="bg-black/50 text-slate-400 font-mono uppercase sticky top-0 backdrop-blur-md z-10">
                     <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Balance</th>
                        <th className="p-4">Joined</th>
                        <th className="p-4 text-right">ID</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {userList.map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                           <td className="p-4">
                              <div className="font-bold text-white group-hover:text-yellow-500 transition-colors">{u.username || 'Anonymous'}</div>
                              <div className="text-slate-600 text-[10px]">{u.email}</div>
                           </td>
                           <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                  u.role === 'admin' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                  {u.role || 'user'}
                              </span>
                           </td>
                           <td className="p-4 font-mono text-green-400 font-bold">
                               {typeof u.balance === 'number' ? `$${u.balance.toFixed(2)}` : <span className="text-slate-700">--</span>}
                           </td>
                           <td className="p-4 text-slate-400">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                           </td>
                           <td className="p-4 text-right text-slate-600 font-mono text-[10px]">
                              {u.id.substring(0,8)}...
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
           )}
        </div>
     </Card>
  );

  const renderActivity = () => (
    <Card className="bg-slate-900 border-white/10 overflow-hidden h-full flex flex-col">
       <div className="p-6 border-b border-white/5 bg-slate-950">
          <h3 className="font-orbitron font-bold text-white flex items-center gap-2">
             <BarChart3 size={16} className="text-blue-500" /> RECENT ACTIVITY
          </h3>
       </div>
       <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
             <thead className="bg-black/50 text-slate-400 font-mono uppercase sticky top-0 backdrop-blur-md z-10">
                <tr>
                   <th className="p-4">Timestamp</th>
                   <th className="p-4">Player</th>
                   <th className="p-4">Tier</th>
                   <th className="p-4">Result</th>
                   <th className="p-4 text-right">Wager</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {analyticsData.userActivity.length === 0 ? (
                   <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 italic">No games recorded recently.</td>
                   </tr>
                ) : analyticsData.userActivity.map((row, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="p-4">
                         <span className="font-bold text-white block">{row.username}</span>
                      </td>
                      <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              row.tier === 'TIER_3' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' :
                              row.tier === 'TIER_2' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                              'border-slate-500/30 text-slate-400'
                          }`}>
                              {row.tier}
                          </span>
                      </td>
                      <td className="p-4">
                          <span className={
                              row.status === 'completed' ? (row.winner_id === row.user_id ? 'text-green-400 font-bold' : 'text-red-400') : 'text-slate-500'
                          }>
                              {row.status === 'completed' ? (row.winner_id === row.user_id ? 'WIN' : 'LOSS') : row.status.toUpperCase()}
                          </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white">
                          ${Number(row.wager).toFixed(2)}
                      </td>
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
                      <div className="text-[10px] text-slate-500 font-mono">v2.5.3-FINANCE</div>
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