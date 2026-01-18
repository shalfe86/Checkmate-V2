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
  LayoutDashboard, PlusCircle, CheckCircle, Wallet, Brain, Zap, Save
} from 'lucide-react';
import { Chess } from 'chess.js';

type AdminTab = 'overview' | 'users' | 'financials' | 'security' | 'ai-lab';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // AI Lab State
  const [aiLabTier, setAiLabTier] = useState<TierLevel>(TierLevel.TIER_3);
  
  // TRAINING DOJO STATE
  const [training, setTraining] = useState(false);
  const trainingRef = useRef(false); // Ref for loop control
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lessonsLearned, setLessonsLearned] = useState(0);
  const [dojoLogs, setDojoLogs] = useState<string[]>([]);
  const memoryBuffer = useRef<Map<string, string>>(new Map());

  // Fetch real users
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      const fetchUsers = async () => {
         const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
         const { data: roles, error: roleError } = await supabase.from('user_roles').select('user_id, role');
         const { data: wallets, error: walletError } = await supabase.from('wallets').select('*');

         if (!profileError && profiles) {
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
      };
      fetchUsers();
    }
  }, [activeTab, isAdmin, refreshTrigger]);

  // Initialize AI Lab game when tab is active
  useEffect(() => {
    if (activeTab === 'ai-lab') {
      selectTier(aiLabTier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  // Helper to start AI Lab Game (Manual Play)
  const startAiLab = (tier: TierLevel) => {
    setAiLabTier(tier);
    selectTier(tier); 
  };

  // --- TRAINING LOGIC ---
  const addDojoLog = (msg: string) => {
      setDojoLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8));
  };

  const uploadMemory = async () => {
      if (memoryBuffer.current.size === 0) return;
      const bufferSize = memoryBuffer.current.size;
      addDojoLog(`💾 Uploading ${bufferSize} new lessons...`);

      const payload = Array.from(memoryBuffer.current.entries()).map(([key, move]) => ({
          fen: key, move_played: move, loss_count: 1
      }));

      const { error } = await supabase.from('ai_memory').upsert(payload, { onConflict: 'fen, move_played' });
      
      if (error) {
          console.error("Upload failed", error);
          addDojoLog("❌ Upload Failed!");
      } else {
          addDojoLog("✅ Memory Synced!");
          memoryBuffer.current.clear();
      }
  };

  const startTraining = async () => {
    if (trainingRef.current) {
        // STOP
        trainingRef.current = false;
        setTraining(false);
        return;
    }
    
    // START
    trainingRef.current = true;
    setTraining(true);
    setGamesPlayed(0);
    setLessonsLearned(0);
    setDojoLogs([]);
    addDojoLog("🚀 DOJO INITIALIZED");

    let count = 0;
    const TARGET = 1000; 
    
    const runBatch = async () => {
        if (!trainingRef.current) return; 

        // Run 1 game per tick to prevent UI freeze
        const BATCH_SIZE = 1; 

        for (let i = 0; i < BATCH_SIZE; i++) {
            if (count >= TARGET || !trainingRef.current) break;
            
            const game = new Chess();
            let moves = 0;
            const DEPTH = 2; 

            while (!game.isGameOver() && moves < 100) {
                moves++;
                const isStudent = game.turn() === 'b';
                const [_, move] = minimax(game, DEPTH, -Infinity, Infinity, isStudent, []);
                if (move) game.move(move);
                else break;
                
                // Yield every few moves to keep UI responsive
                if (moves % 20 === 0) await new Promise(r => setTimeout(r, 0));
            }

            if (game.isCheckmate()) {
                const winner = game.turn() === 'w' ? 'Black' : 'White';
                if (winner === 'White') {
                   // STUDENT LOST -> LEARN
                   game.undo(); 
                   const fatalMove = game.undo(); 
                   if (fatalMove) {
                       const fenBase = game.fen().split(' ').slice(0, 4).join(' ');
                       if (!memoryBuffer.current.has(fenBase)) {
                           memoryBuffer.current.set(fenBase, fatalMove.san);
                           setLessonsLearned(prev => prev + 1);
                       }
                   }
                }
            }
            count++;
            setGamesPlayed(prev => prev + 1);
        }

        if (count % 10 === 0) {
            await uploadMemory();
        }

        if (count < TARGET && trainingRef.current) {
            setTimeout(runBatch, 10); // Small delay between games
        } else {
            if (trainingRef.current) {
                trainingRef.current = false;
                setTraining(false);
                await uploadMemory();
                addDojoLog("🎉 TRAINING COMPLETE!");
            } else {
                addDojoLog("🛑 TRAINING ABORTED");
            }
        }
    };
    
    runBatch();
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Total Users</div>
                      <div className="text-2xl font-bold text-white font-orbitron">{userList.length > 0 ? userList.length : '--'}</div>
                   </div>
                   <Users className="text-slate-500" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-green-500 flex items-center gap-1">
                   <Activity size={10} /> Live Data
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Total Revenue</div>
                      <div className="text-2xl font-bold text-yellow-500 font-orbitron">--</div>
                   </div>
                   <DollarSign className="text-yellow-500" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                   Vault: -- | Reserve: --
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Active Games</div>
                      <div className="text-2xl font-bold text-blue-400 font-orbitron">--</div>
                   </div>
                   <Server className="text-blue-400" size={20} />
                </div>
                <div className="mt-2 text-[10px] text-blue-300">
                   Server Load: --%
                </div>
             </div>
          </Card>
          <Card className="bg-slate-900 border-white/10">
             <div className="p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-xs text-slate-500 uppercase font-mono">Security Alerts</div>
                      <div className="text-2xl font-bold text-red-500 font-orbitron">0</div>
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
                <div className="text-xs text-slate-500 italic text-center p-4">No recent alerts.</div>
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
                    <th className="p-4">Role</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {userList.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="p-8 text-center text-slate-500">Loading users...</td>
                    </tr>
                 ) : userList.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                       <td className="p-4">
                          <div className="font-bold text-white">{u.username || 'Unknown'}</div>
                          <div className="text-slate-500 text-[10px] font-mono">{u.id}</div>
                       </td>
                       <td className="p-4 font-mono text-yellow-500">{u.role || 'user'}</td>
                       <td className="p-4 font-mono text-green-400">${u.balance?.toFixed(2) || '0.00'}</td>
                       <td className="p-4 text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Terminal size={14} />
                            </Button>
                          </div>
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
                Automatic heuristic analysis has flagged <strong>0 accounts</strong> for review.
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
             <div className="p-8 text-center text-slate-500 italic text-xs">
                No high priority cases active.
             </div>
          </div>
       </Card>
    </div>
  );

  const renderAiLab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
       {/* CONTROLS */}
       <div className="lg:col-span-1 space-y-4">
          
          {/* TRAINING DOJO WIDGET */}
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
             
             <div className="h-24 bg-black rounded p-2 text-[10px] font-mono text-green-400/80 overflow-y-auto mb-4 border border-white/5">
                {dojoLogs.map((l, i) => <div key={i}>{l}</div>)}
                {dojoLogs.length === 0 && <span className="text-slate-600">Waiting for command...</span>}
             </div>

             <Button 
                onClick={startTraining} 
                className={`w-full ${training ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
             >
                {training ? 'STOP SIMULATION' : 'START 1,000 GAME BATCH'}
             </Button>
          </Card>

          {/* MANUAL RESEARCH LAB */}
          <Card className="bg-slate-900 border-white/10 p-6">
             <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-yellow-500" /> MANUAL RESEARCH
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
                </div>

                <Button onClick={() => selectTier(aiLabTier)} className="w-full" variant="outline">
                   RESET BOARD
                </Button>
             </div>
          </Card>
       </div>

       {/* BOARD (MANUAL TEST) */}
       <div className="lg:col-span-2 flex items-center justify-center bg-black/50 rounded-xl border border-white/5 relative p-4">
          <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded text-xs text-yellow-500 font-mono border border-yellow-500/20 z-10">
             DEBUG MODE ACTIVE
          </div>
          <Board className="w-[500px] h-[500px]" />
       </div>
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-[#020202] text-white pt-24 px-4 pb-12 font-sans selection:bg-red-500/30">
      <div className="container mx-auto max-w-7xl">
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-3xl font-orbitron font-bold text-red-500 flex items-center gap-3">
                  <ShieldAlert size={32} /> COMMAND CENTER
               </h1>
               <p className="text-slate-500 text-sm font-mono mt-1">
                  ADMINISTRATOR: {user?.email} | ID: {user?.id?.substring(0,8)}
               </p>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Tab Selection */}
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
    </>
  );
};