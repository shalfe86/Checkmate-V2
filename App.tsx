import React, { Suspense, lazy } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/ui/Navbar';
import { Loader2 } from 'lucide-react';

// LAZY LOAD PAGES
const TierSelection = lazy(() => import('./pages/TierSelection').then(module => ({ default: module.TierSelection })));
const GameRoom = lazy(() => import('./pages/GameRoom').then(module => ({ default: module.GameRoom })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Rules = lazy(() => import('./pages/Rules').then(module => ({ default: module.Rules })));
const Terms = lazy(() => import('./pages/Terms').then(module => ({ default: module.Terms })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PlayPaid = lazy(() => import('./pages/PlayPaid').then(module => ({ default: module.PlayPaid })));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <Loader2 className="animate-spin text-yellow-500 h-8 w-8" />
  </div>
);

const AppContent: React.FC = () => {
  const { currentTier, user, currentView, activeGameId, exitGame } = useGame();

  // Wrap conditionals in Suspense
  return (
    <Suspense fallback={<PageLoader />}>
      {(() => {
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
      })()}
    </Suspense>
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