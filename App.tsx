import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Dashboard } from './pages/Dashboard';
import { Rules } from './pages/Rules';
import { Terms } from './pages/Terms';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/ui/Navbar';
import { PlayPaid } from './pages/PlayPaid';

const AppContent: React.FC = () => {
  const { currentTier, user, currentView, activeGameId, exitGame } = useGame();

  // 1. Admin Dashboard View (High Priority if selected)
  if (currentView === 'admin' && user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <AdminDashboard />
      </div>
    );
  }

  // 2. Active Server Game View (Paid)
  if (activeGameId) {
    return <PlayPaid gameId={activeGameId} onExit={exitGame} />;
  }

  // 3. Client Game View (Free Tier)
  if (currentTier) {
    return <GameRoom />;
  }

  // 4. Rules View
  if (currentView === 'rules') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Rules />
      </div>
    );
  }

  // 5. Terms View
  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Terms />
      </div>
    );
  }

  // 6. Authenticated User Dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Dashboard />
      </div>
    );
  }

  // 7. Guest Landing Page
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