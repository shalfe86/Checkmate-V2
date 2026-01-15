import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Dashboard } from './pages/Dashboard';
import { Rules } from './pages/Rules';
import { Terms } from './pages/Terms';
import { Navbar } from './components/ui/Navbar';

const AppContent: React.FC = () => {
  const { currentTier, user, currentView } = useGame();

  // 1. Game View (Highest Priority)
  if (currentTier) {
    return <GameRoom />;
  }

  // 2. Rules View (Accessible from anywhere)
  if (currentView === 'rules') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Rules />
      </div>
    );
  }

  // 3. Terms View (Accessible from anywhere)
  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Terms />
      </div>
    );
  }

  // 4. Authenticated Dashboard View
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Dashboard />
      </div>
    );
  }

  // 5. Guest Landing Page
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