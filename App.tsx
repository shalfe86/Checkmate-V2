import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TierSelection } from './pages/TierSelection';
import { GameRoom } from './pages/GameRoom';
import { Navbar } from './components/ui/Navbar';

const AppContent: React.FC = () => {
  const { currentTier } = useGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-yellow-500/30 flex flex-col">
      {/* Only show Navbar if we are not in a game, or keep it always? 
          User asked for home screen changes, but let's keep it consistent 
          unless inside GameRoom where we have a custom header. 
      */}
      {!currentTier && <Navbar />}
      
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