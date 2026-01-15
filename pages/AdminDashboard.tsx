import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Board } from '../components/game/Board';
import { evaluatePosition } from '../lib/engine';
import { TierLevel } from '../types';
import { TIERS } from '../constants';
import { 
  ShieldAlert, Users, DollarSign, Activity, Terminal, 
  Search, Ban, AlertTriangle, Eye, Server, Cpu, Database
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'financials' | 'security' | 'ai-lab';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, selectTier, game, gameState } = useGame();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // AI Lab State
  const [aiLabTier, setAiLabTier] = useState<TierLevel>(TierLevel.TIER_3);

  // If mock/bypass mode is active, user might be null but isAdmin true in context override
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-500 font-mono p-4 text-center">
        <div>
          <ShieldAlert size={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">ACCESS DENIED</h1>
          <p className="mt-2 text-sm text-red-400">Authorization Level Insufficient.</p>
        </div>
      </div>
    );
  }

  // --- MOCK DATA ---
  const MOCK_USERS = [
    { id: '1', username: 'ChessKing99', email: 'king@gmail.com', balance: 142.50, winRate: 65, status: 'Active' },
    { id: '2', username: 'DeepBlue_v2', email: 'bot@rus.ru', balance: 850.00, winRate: 92, status: 'Flagged' },
    { id: '3', username: 'CasualPlayer', email: 'john@doe.com', balance: 12.00, winRate: 45, status: 'Active' },
    { id: '4', username: 'SpeedDemon', email: 'fast@chess.com', balance: 45.50, winRate: 55, status: 'Active' },
    { id: '5', username: 'Suspect_Zero', email: 'hack@elite.net', balance: 1200.00, winRate: 98, status: 'Suspended' }
  ];

  // Helper to start AI Lab Game
  const startAiLab = (tier: TierLevel) => {
    setAiLabTier(tier);
    selectTier(tier); 
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Total Users</div>
                      <div className="text-2xl font-bold text-white font-orbitron">42,093</div>
                   </div>
                   <Users className="text-slate-500" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-green-500 flex items-center gap-1">
                   <Activity size={10} /> +124 today
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Total Revenue</div>
                      <div className="text-2xl font-bold text-yellow-500 font-orbitron">$845k</div>
                   </div>
                   <DollarSign className="text-yellow-500" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                   Vault: $124k | Reserve: $721k
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Active Games</div>
                      <div className="text-2xl font-bold text-blue-400 font-orbitron">842</div>
                   </div>
                   <Server className="text-blue-400" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-blue-300">
                   Server Load: 34%
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Security Alerts</div>
                      <div className="text-2xl font-bold text-red-500 font-orbitron">5</div>
                   </div>
                   <ShieldAlert className="text-red-500" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-red-400">
                   Requires Immediate Attention
                </div>
             </div>
          </Card>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-white/10 h-64">
             <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm font-orbitron">SYSTEM HEALTH</h3>
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">OPERATIONAL</span>
             </div>
             <div className="p-6 flex items-center justify-center h-full text-slate-500 font-mono text-xs">
                Latency &lt; 45ms
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10 h-64">
             <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm font-orbitron">RECENT ALERTS</h3>
             </div>
             <div className="p-4 space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-white/5 p-2 rounded border border-white/5">
                     <AlertTriangle size={12} className="text-yellow-500" />
                     <span className="text-slate-300">High volume of rapid moves detected in Game #{1000+i}</span>
                     <span className="ml-auto text-slate-600 font-mono">10:4{i} AM</span>
                  </div>
                ))}
             </div>
          </Card>
       </div>
    </div>
  );

  const renderUsers = () => (
     <Card className="bg-slate-900 border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
           <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Search user ID, email..." 
                className="bg-black/50 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none w-64"
              />
           </div>
           <div className="flex gap-2">
              <Button size="sm" variant="outline">Export CSV</Button>
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-xs">
              <thead className="bg-black/50 text-slate-400 font-mono uppercase">
                 <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Win Rate</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {MOCK_USERS.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                       <td className="p-4">
                          <div className="font-bold text-white">{u.username}</div>
                          <div className="text-slate-500">{u.email}</div>
                       </td>
                       <td className="p-4 font-mono text-yellow-500">${u.balance.toFixed(2)}</td>
                       <td className={`p-4 font-bold ${u.winRate > 60 ? 'text-green-400' : 'text-slate-400'}`}>
                          {u.winRate}%
                       </td>
                       <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${
                             u.status === 'Active' ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                             u.status === 'Flagged' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                             'bg-red-900/20 text-red-400 border-red-500/30'
                          }`}>
                             {u.status}
                          </span>
                       </td>
                       <td className="p-4 text-right">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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

  const renderSecurity = () => (
    <div className="space-y-6">
       <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-xl flex items-start gap-4">
          <ShieldAlert size={32} className="text-red-500 mt-1" />
          <div>
             <h3 className="text-xl font-orbitron font-bold text-white">SECURITY OVERVIEW</h3>
             <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Automatic heuristic analysis has flagged <strong>2 accounts</strong> for review. These accounts exhibit 
                statistically improbable performance (Computer Aggregation Score &gt; 95%).
             </p>
          </div>
       </div>

       <Card className="bg-slate-900 border-red-500/20">
          <div className="p-4 border-b border-white/5 bg-red-950/10">
             <h3 className="font-bold text-red-400 text-sm font-orbitron flex items-center gap-2">
                <Eye size={16} /> HIGH PRIORITY REVIEW
             </h3>
          </div>
          <div className="divide-y divide-white/5">
             {MOCK_USERS.filter(u => u.winRate > 90).map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                         {u.username[0]}
                      </div>
                      <div>
                         <div className="font-bold text-white">{u.username}</div>
                         <div className="text-xs text-red-400 font-mono">Win Rate: {u.winRate}% | Avg Move: 0.3s</div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-red-500/50 text-red-400 hover:bg-red-900/20">
                         <Database size={12} className="mr-1" /> Logs
                      </Button>
                      <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white border-none">
                         <Ban size={12} className="mr-1" /> SUSPEND
                      </Button>
                   </div>
                </div>
             ))}
          </div>
       </Card>
    </div>
  );

  const renderAiLab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
       {/* Controls */}
       <div className="lg:col-span-1 space-y-4">
          <Card className="bg-slate-900 border-white/10 p-6">
             <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-yellow-500" /> AI RESEARCH LAB
             </h3>
             <div className="space-y-4">
                <div>
                   <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Target Config</label>
                   <div className="grid grid-cols-3 gap-2">
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
                </div>

                <div className="p-4 bg-black rounded border border-white/10 font-mono text-xs space-y-2">
                   <div className="flex justify-between">
                      <span className="text-slate-500">ENGINE STATUS:</span>
                      <span className="text-green-400">ONLINE</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-500">DEPTH:</span>
                      <span className="text-white">3 (Mid) / 4 (End)</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-500">STATIC EVAL:</span>
                      <span className={`${evaluatePosition(game) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                         {evaluatePosition(game)}
                      </span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-500">NODES/SEC:</span>
                      <span className="text-white">~12k</span>
                   </div>
                </div>

                <Button onClick={() => selectTier(aiLabTier)} className="w-full" variant="outline">
                   RESET BOARD
                </Button>
             </div>
          </Card>

          <Card className="bg-slate-900 border-white/10 p-4 flex-1 overflow-y-auto max-h-[400px]">
             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Move Stream</h4>
             <div className="font-mono text-xs space-y-1 text-slate-400">
                {gameState.history.map((m, i) => (
                   <div key={i} className="flex gap-2">
                      <span className="text-slate-600">{(i/2 + 1).toFixed(0)}.</span>
                      <span className={i % 2 === 0 ? 'text-white' : 'text-yellow-500'}>{m}</span>
                   </div>
                ))}
                {gameState.history.length === 0 && <span className="opacity-50 italic">Waiting for input...</span>}
             </div>
          </Card>
       </div>

       {/* Board */}
       <div className="lg:col-span-2 flex items-center justify-center bg-black/50 rounded-xl border border-white/5 relative">
          <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded text-xs text-yellow-500 font-mono border border-yellow-500/20">
             DEBUG MODE ACTIVE
          </div>
          <div className="scale-90">
             <Board />
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white pt-24 px-4 pb-12 font-sans selection:bg-red-500/30">
      <div className="container mx-auto max-w-7xl">
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-3xl font-orbitron font-bold text-red-500 flex items-center gap-3">
                  <ShieldAlert size={32} /> COMMAND CENTER
               </h1>
               <p className="text-slate-500 text-sm font-mono mt-1">
                  ADMINISTRATOR: {user?.email || 'MOCK_ADMIN'} | ID: {user?.id?.substring(0,8) || '0000'}
               </p>
            </div>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg overflow-x-auto">
               {[
                 { id: 'overview', icon: Activity, label: 'Overview' },
                 { id: 'users', icon: Users, label: 'Users' },
                 { id: 'financials', icon: DollarSign, label: 'Financials' },
                 { id: 'security', icon: AlertTriangle, label: 'Security' },
                 { id: 'ai-lab', icon: Cpu, label: 'AI Lab' }
               ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AdminTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${
                       activeTab === tab.id 
                       ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                       : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                     <tab.icon size={14} />
                     <span className="hidden md:inline">{tab.label}</span>
                  </button>
               ))}
            </div>
         </div>

         <div className="min-h-[600px]">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'financials' && (
               <Card className="bg-slate-900 border-white/10 p-6 text-center text-slate-500 italic">
                  Financial Ledger Integration Pending Backend Connection...
               </Card>
            )}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'ai-lab' && renderAiLab()}
         </div>

      </div>
    </div>
  );
};