import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ScrollText, Shield, Scale, AlertTriangle, Target, Crown } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const Rules: React.FC = () => {
  const { setView } = useGame();
  
  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const sections = [
    {
      title: "1. Game Overview",
      content: (
        <>
          <p>All games are played against an AI opponent using standard chess rules.</p>
          <div className="my-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <h4 className="text-yellow-500 font-bold mb-2 text-xs uppercase tracking-widest">Winning Condition</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Checkmate the AI, or</li>
              <li>Cause the AI to lose on time.</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500 italic">A draw is considered a non-winning outcome for jackpot purposes.</p>
          </div>
          <p>The Platform offers multiple gameplay tiers, each with distinct time controls, entry requirements, and jackpot mechanics.</p>
        </>
      )
    },
    {
      title: "2. Free Tier (Practice Mode)",
      icon: <Shield className="text-slate-400" size={20} />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <h4 className="font-bold text-white mb-2">Time Controls</h4>
              <ul className="text-sm space-y-1 text-slate-400">
                <li><span className="text-slate-300">Start:</span> 40 seconds</li>
                <li><span className="text-slate-300">Increment:</span> +2 seconds</li>
                <li><span className="text-slate-300">Maximum Time:</span> 50 seconds</li>
              </ul>
           </div>
           <div>
              <h4 className="font-bold text-white mb-2">Features</h4>
              <ul className="text-sm space-y-1 text-slate-400">
                <li>No account required</li>
                <li>No monetary payouts</li>
                <li>Unlimited play</li>
                <li>Moderate AI strength for training</li>
              </ul>
           </div>
        </div>
      )
    },
    {
      title: "3. Starter Tier (Tier 2)",
      icon: <Target className="text-blue-400" size={20} />,
      content: (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">ENTRY FEE: $1.00</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <h4 className="font-bold text-white mb-2">Time Controls</h4>
                <ul className="text-sm space-y-1 text-slate-400">
                  <li><span className="text-slate-300">Start:</span> 30 seconds</li>
                  <li><span className="text-slate-300">Increment:</span> +1 second</li>
                  <li><span className="text-slate-300">Maximum Time:</span> 35 seconds</li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-white mb-2">Jackpot Mechanics</h4>
                <ul className="text-sm space-y-1 text-slate-400">
                  <li>Jackpot starts at <span className="text-blue-400 font-bold">$5</span></li>
                  <li>Increases by $0.75 per completed game</li>
                  <li>Jackpot is capped at $1,000</li>
                  <li>Max 1 jackpot win per month</li>
                </ul>
             </div>
          </div>
        </div>
      )
    },
    {
      title: "4. World Tier (Tier 3)",
      icon: <Crown className="text-yellow-400" size={20} />,
      content: (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">ENTRY FEE: $2.00</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <h4 className="font-bold text-white mb-2">Time Controls</h4>
                <ul className="text-sm space-y-1 text-slate-400">
                  <li><span className="text-slate-300">Start:</span> 25 seconds</li>
                  <li><span className="text-slate-300">Increment:</span> +1 second</li>
                  <li><span className="text-slate-300">Maximum Time:</span> 25 seconds</li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-white mb-2">Jackpot Mechanics</h4>
                <ul className="text-sm space-y-1 text-slate-400">
                  <li>Jackpot starts at <span className="text-yellow-400 font-bold">$5</span></li>
                  <li>Increases by $1.00 per completed game</li>
                  <li>No jackpot cap</li>
                  <li>Unlimited wins (subject to review)</li>
                </ul>
             </div>
          </div>
        </div>
      )
    }
  ];

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
           <h1 className="text-4xl md:text-5xl font-orbitron font-black text-white mb-4">RULES OF PLAY</h1>
           <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
             Welcome to Checkmate Jackpot. These Rules of Play are designed to ensure fair, transparent, and consistent gameplay across all tiers. By playing on the Platform, you agree to these Rules and the Terms of Service.
           </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <Card key={idx} className="border-white/5 bg-slate-900/40 backdrop-blur-sm">
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  {section.icon && <div className="p-2 bg-white/5 rounded-lg border border-white/5">{section.icon}</div>}
                  <h2 className="text-xl font-orbitron font-bold text-white tracking-wide">{section.title}</h2>
                </div>
                <div className="font-tech text-slate-400 leading-relaxed text-sm md:text-base space-y-4">
                  {section.content}
                </div>
              </div>
            </Card>
          ))}

          {/* Additional Text Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-6">
              <section>
                <h3 className="text-white font-bold font-orbitron mb-2">5. Jackpot Awarding & Priority</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  If multiple games conclude in close proximity, the jackpot is awarded to the earliest-started eligible winning game. 
                  Subsequent games may display "Pending Jackpot Verification." After a jackpot is awarded, Tier 2 jackpots reset to $5, and Tier 3 jackpots reset to $5 or may continue growing if applicable.
                </p>
              </section>
              <section>
                <h3 className="text-white font-bold font-orbitron mb-2">6. Player Eligibility & Limits</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Tier 2 players are limited to one jackpot win per calendar month. Tier 3 players may win multiple jackpots, subject to review. 
                  All jackpot claims require successful identity verification.
                </p>
              </section>
              <section>
                <h3 className="text-white font-bold font-orbitron mb-2">7. Identity Verification & Taxes</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Users must complete identity verification through the Platform's third-party payout provider. 
                  Players are solely responsible for determining and complying with any tax obligations related to winnings.
                </p>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-white font-bold font-orbitron mb-2">8. Jurisdiction</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Participation and payouts are available only in approved jurisdictions (US, Canada, UK, Ireland, Australia, New Zealand, and select EU countries).
                </p>
              </section>
              <section>
                <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg">
                  <h3 className="text-red-400 font-bold font-orbitron mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> 9. Anti-Cheat Policy
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    The use of chess engines, scripts, automation, collusion, or any external assistance is strictly prohibited. 
                    If cheating is suspected, payouts may be paused, games reviewed, and accounts banned. All enforcement decisions are final.
                  </p>
                </div>
              </section>
              <section>
                 <h3 className="text-white font-bold font-orbitron mb-2">12. General Conditions</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                   The Platform may adjust AI difficulty, time controls, jackpot mechanics, or other parameters to maintain fairness. 
                   Participation constitutes acceptance of these Rules.
                 </p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
           <Button onClick={() => setView('lobby')} className="gold-btn w-full md:w-auto min-w-[200px]">
             I Understand - Return to Home
           </Button>
        </div>

      </div>
    </div>
  );
};