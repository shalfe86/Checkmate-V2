import React from 'react';
import { useGame } from '../context/GameContext';
import { Board } from '../components/game/Board';
import { Timer } from '../components/game/Timer';
import { Button } from '../components/ui/Button';
import { TierLevel } from '../types';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const GameRoom: React.FC = () => {
  const { currentTier, gameState, whiteTime, blackTime, resetGame, selectTier } = useGame();

  if (!currentTier) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Header / Info Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
             <ArrowLeft className="h-4 w-4 mr-2" /> Exit
          </Button>
          <div className="hidden md:block">
            <h2 className="text-yellow-500 font-bold font-orbitron text-lg">{currentTier.name}</h2>
            <span className="text-xs text-slate-500">
              {currentTier.timeControl.initial}s + {currentTier.timeControl.increment}s | Max {currentTier.timeControl.maxCap}s
            </span>
          </div>
        </div>

        {/* Jackpot / Status Display */}
        <div className="flex items-center gap-4">
           {currentTier.id !== TierLevel.TIER_1 && (
             <div className="flex flex-col items-end">
               <span className="text-xs text-slate-500 uppercase tracking-widest">Jackpot</span>
               <span className="text-xl font-bold text-yellow-400 neon-glow">${currentTier.jackpotSplit.toFixed(2)}</span>
             </div>
           )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col md:flex-row">
        
        {/* Ads / Side Panel (Left) */}
        <div className="hidden lg:flex w-64 border-r border-slate-800 flex-col p-4 space-y-4 bg-slate-950/50">
          {currentTier.hasAds && (
            <>
              <div className="h-32 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-slate-600 text-xs">AD SLOT 1</div>
              <div className="h-32 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-slate-600 text-xs">AD SLOT 2</div>
            </>
          )}
          <div className="flex-1">
             <h3 className="text-slate-400 font-orbitron text-sm mb-2">Move History</h3>
             <div className="h-64 overflow-y-auto font-mono text-xs text-slate-500 bg-slate-900 p-2 rounded">
                {gameState.history.map((move, i) => (
                  <span key={i} className={`inline-block w-1/2 ${i % 2 === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                    {Math.floor(i/2) + 1}. {move}
                  </span>
                ))}
             </div>
          </div>
        </div>

        {/* Board & Timers (Center) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
          
          {/* Opponent Timer */}
          <div className="mb-4 flex items-center justify-between w-full max-w-[600px]">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-500">OP</div>
               <div className="text-sm text-slate-400">Opponent (Bot)</div>
            </div>
            <Timer 
              time={blackTime} 
              maxTime={currentTier.timeControl.maxCap} 
              isActive={gameState.turn === 'b' && !gameState.isGameOver}
              label="Black"
            />
          </div>

          <Board />

          {/* Player Timer */}
          <div className="mt-4 flex items-center justify-between w-full max-w-[600px]">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded bg-yellow-900/20 border border-yellow-500/50 flex items-center justify-center font-bold text-yellow-500">ME</div>
               <div className="text-sm text-yellow-500/80">You</div>
            </div>
            <Timer 
               time={whiteTime} 
               maxTime={currentTier.timeControl.maxCap} 
               isActive={gameState.turn === 'w' && !gameState.isGameOver}
               label="White"
            />
          </div>

          {/* Game Over Overlay */}
          {gameState.isGameOver && (
             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-slate-900 border border-yellow-500 p-8 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center max-w-sm mx-4">
                   <h2 className="text-4xl font-orbitron font-bold text-white mb-2">GAME OVER</h2>
                   <p className="text-xl text-yellow-500 mb-6">
                      {gameState.winner === 'w' ? 'YOU WON!' : gameState.winner === 'b' ? 'YOU LOST' : 'DRAW'}
                   </p>
                   {gameState.winner === 'w' && currentTier.entryFee > 0 && (
                      <p className="text-sm text-green-400 mb-6 flex items-center justify-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Payout processed: ${currentTier.jackpotSplit.toFixed(2)}
                      </p>
                   )}
                   <Button onClick={resetGame} className="w-full">PLAY AGAIN</Button>
                </div>
             </div>
          )}
        </div>

        {/* Ads (Right - Mobile hidden) */}
        {currentTier.hasAds && (
          <div className="hidden xl:flex w-64 border-l border-slate-800 flex-col p-4 bg-slate-950/50">
            <div className="h-full bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-slate-600 text-xs">
               SKYSCRAPER AD
            </div>
          </div>
        )}

      </main>
    </div>
  );
};