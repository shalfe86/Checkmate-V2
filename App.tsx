import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Dashboard } from './pages/Dashboard';
import { Rules } from './pages/Rules';
import { Terms } from './pages/Terms';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/ui/Navbar';
import { AlertTriangle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentTier, user, currentView } = useGame();

  // 1. Admin Dashboard View (High Priority if selected)
  if (currentView === 'admin' && user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <AdminDashboard />
      </div>
    );
  }

  // 2. Game View
  if (currentTier) {
    return <GameRoom />;
  }

  // 3. Rules View
  if (currentView === 'rules') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Rules />
      </div>
    );
  }

  // 4. Terms View
  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Terms />
      </div>
    );
  }

  // 5. Authenticated User Dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Dashboard />
      </div>
    );
  }

  // 6. Guest Landing Page
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
      <Navbar />
      <TierSelection />
    </div>
  );
};

const App: React.FC = () => {
  const env = (import.meta as any).env || {};
  const isConfigMissing = !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY;

  return (
    <GameProvider>
      {isConfigMissing && (
        <div className="fixed bottom-4 right-4 z-[100] bg-red-900/90 border border-red-500 text-white p-4 rounded-lg shadow-xl max-w-sm flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-bottom-5 pointer-events-none">
           <AlertTriangle className="text-red-400 shrink-0" size={20} />
           <div>
             <h3 className="font-bold text-sm mb-1">Database Config Missing</h3>
             <p className="text-xs text-slate-300">
               Please create a <code>.env</code> file with your Supabase credentials to enable server features.
             </p>
           </div>
        </div>
      )}
      <AppContent />
    </GameProvider>
  );
};

export default App;