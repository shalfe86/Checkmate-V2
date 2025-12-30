import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';

const AppContent: React.FC = () => {
  const { currentTier } = useGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30">
      {currentTier ? <GameRoom /> : <TierSelection />}
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