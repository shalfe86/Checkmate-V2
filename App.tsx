import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Dashboard } from './pages/Dashboard';
import { Navbar } from './components/ui/Navbar';

const AppContent: React.FC = () => {
  const { currentTier, user } = useGame();

  // If in a game, show GameRoom
  if (currentTier) {
    return <GameRoom />;
  }

  // If logged in, show Dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
        <Navbar />
        <Dashboard />
      </div>
    );
  }

  // If guest, show Landing Page (TierSelection)
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