import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Dashboard } from './pages/Dashboard';
import { Rules } from './pages/Rules';
import { Terms } from './pages/Terms';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/ui/Navbar';

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
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;