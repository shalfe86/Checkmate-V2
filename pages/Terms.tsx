import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { TermsBody } from '../components/legal/TermsBody';

export const Terms: React.FC = () => {
  const { setView } = useGame();
  
  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 font-sans selection:bg-yellow-500/30">
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      
      <div className="container mx-auto max-w-4xl relative z-10">
        
        {/* Navigation */}
        <Button 
          variant="ghost" 
          onClick={() => setView('lobby')} 
          className="mb-8 pl-0 hover:bg-transparent hover:text-yellow-500 group"
        >
           <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Button>
        
        {/* Header */}
        <div className="mb-12 border-b border-white/10 pb-8">
           <div className="flex items-center gap-3 mb-4 text-yellow-500">
             <ScrollText size={32} />
             <span className="font-mono text-sm uppercase tracking-widest border border-yellow-500/30 px-3 py-1 rounded-full bg-yellow-500/10">Legal Agreement</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-orbitron font-black text-white mb-6">TERMS OF SERVICE</h1>
           <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed font-tech">
             These Terms of Service ("Terms") constitute a binding legal agreement between you ("User," "Player," "You") and Checkmate Jackpot LLC ("Company," "We," "Us," "Our"). By accessing or using the Checkmate Jackpot platform ("Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms.
           </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-sm">
            <div className="p-8">
              <TermsBody />
            </div>
          </Card>

          <div className="text-center pt-8">
             <Button onClick={() => setView('lobby')} variant="outline" className="w-full md:w-auto min-w-[200px]">
               Return to Home
             </Button>
          </div>
        
        </div>
      </div>
    </div>
  );
};