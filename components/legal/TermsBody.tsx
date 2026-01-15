import React from 'react';
import { Globe, Lock, AlertTriangle } from 'lucide-react';

export const TermsBody: React.FC = () => {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-orbitron font-bold text-white flex items-center gap-2">
          <Globe className="text-blue-500" size={20} /> 1. Eligibility
        </h2>
        <div className="pl-4 border-l-2 border-white/5 space-y-4 text-slate-300 text-sm leading-relaxed">
          <div>
            <strong className="text-white block mb-1">1.1 Age Requirement</strong>
            Users must be at least 18 years old, or the age of legal majority in their jurisdiction, whichever is greater.
          </div>
          <div>
            <strong className="text-white block mb-1">1.2 Legal Participation</strong>
            Participation is permitted only in jurisdictions where skill-based competitions with monetary prizes are lawful.
          </div>
          <div>
            <strong className="text-white block mb-1">1.3 Permitted Countries (Class A Launch Regions)</strong>
            At launch, participation and payouts are permitted only for users physically located in, and legally resident of:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>United States (US), Canada (CA)</li>
              <li>United Kingdom (GB), Ireland (IE)</li>
              <li>Australia (AU), New Zealand (NZ)</li>
              <li>Western & Northern Europe (AT, BE, CH, DE, DK, ES, FI, FR, IT, LU, NL, NO, PT, SE, IS, LI)</li>
            </ul>
          </div>
          <div>
            <strong className="text-white block mb-1">1.4 Restricted Regions</strong>
            Access is prohibited from jurisdictions subject to sanctions or prize competition prohibitions, including but not limited to: Cuba, Iran, North Korea, Syria, Russia, Belarus, and others where unlawful.
          </div>
        </div>
      </section>

      <div className="h-px bg-white/5"></div>

      <section className="space-y-4">
        <h2 className="text-xl font-orbitron font-bold text-white flex items-center gap-2">
          <Lock className="text-yellow-500" size={20} /> 2. Account Registration
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-300 text-sm">
          <li><strong className="text-white">Accuracy:</strong> Users must provide accurate and truthful information.</li>
          <li><strong className="text-white">Single Account:</strong> One account per individual.</li>
          <li><strong className="text-white">Security:</strong> Users are responsible for safeguarding credentials.</li>
        </ul>
      </section>

      <div className="h-px bg-white/5"></div>

      <section className="space-y-4">
        <h2 className="text-xl font-orbitron font-bold text-white">3. Gameplay & Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded border border-white/5">
            <h3 className="text-slate-200 font-bold mb-2">Free Tier</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>No sign-up required</li>
              <li>No monetary payouts</li>
              <li>40s start, +2s inc, 50s max</li>
            </ul>
          </div>
          <div className="bg-blue-950/20 p-4 rounded border border-blue-500/20">
            <h3 className="text-blue-200 font-bold mb-2">Starter Tier</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>Entry fee: $1</li>
              <li>Jackpot cap applies</li>
              <li>30s start, +1s inc, 35s max</li>
            </ul>
          </div>
          <div className="bg-yellow-950/20 p-4 rounded border border-yellow-500/20">
            <h3 className="text-yellow-200 font-bold mb-2">World Tier</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>Entry fee: $2</li>
              <li>Uncapped jackpot</li>
              <li>25s start, +1s inc, 25s max</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-slate-500 italic mt-2 mb-4">Note: Draws are treated as non-winning outcomes for jackpot purposes.</p>
        
        <div className="bg-slate-900/50 p-4 rounded border border-white/5">
           <h3 className="text-white font-bold mb-2 text-sm">3.1 Acknowledgment of Jackpot Mechanics</h3>
           <p className="text-sm text-slate-400 mb-2">By participating in paid gameplay, Users acknowledge and agree that:</p>
           <ul className="list-disc pl-5 text-sm text-slate-400 space-y-1">
              <li>Jackpots may be awarded to one or multiple winners;</li>
              <li>Jackpots may be split among multiple eligible winners;</li>
              <li>Jackpot amounts may change during gameplay;</li>
              <li>Jackpot eligibility and payout timing are governed by Platform verification rules.</li>
           </ul>
           <p className="text-sm text-slate-400 mt-2 font-bold">Acceptance of these mechanics is required to participate in paid tiers.</p>
        </div>
      </section>

      <div className="h-px bg-white/5"></div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
        <section className="space-y-4">
          <h2 className="text-lg font-orbitron font-bold text-white">4. Jackpot Awarding & Splitting</h2>
          
          <div className="space-y-4 pl-4 border-l-2 border-yellow-500/20 text-sm text-slate-300">
            <div>
              <strong className="text-white block mb-1">4.1 Single Jackpot per Cycle</strong>
              Each jackpot cycle results in a single jackpot award event. The jackpot is awarded once per cycle and then resets in accordance with Platform rules.
            </div>
            <div>
              <strong className="text-white block mb-1">4.2 Jackpot Timing</strong>
              The jackpot amount awarded is determined based on the jackpot value at the time the Platform finalizes the jackpot award for that cycle. Jackpot values displayed during gameplay are informational only and are not guarantees of payout.
            </div>
            <div>
              <strong className="text-white block mb-1">4.3 Multiple Winners & Jackpot Splitting</strong>
              If multiple eligible winning games are confirmed within a short verification period, the jackpot for that cycle may be split equally among all such winners. The determination of eligible winners, verification timing, and split methodology is handled exclusively by the Platform and is final.
            </div>
            <div>
              <strong className="text-white block mb-1">4.4 Jackpot Reset & Ongoing Games</strong>
              Following a jackpot award, the jackpot resets immediately. Games already in progress at the time of a jackpot award may still be eligible to share in that jackpot if they meet the Platform’s eligibility criteria. Otherwise, such games will continue competing for the newly reset jackpot.
            </div>
            <div>
              <strong className="text-white block mb-1">4.5 No Guaranteed Jackpot Entitlement</strong>
              Starting or participating in a game does not guarantee entitlement to a jackpot payout. Jackpot eligibility is determined solely by final verified game outcomes and Platform rules.
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-2">
              <h2 className="text-lg font-orbitron font-bold text-white">5. Identity Verification (KYC)</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                To withdraw or claim any prize, users must complete identity verification (Legal name, Address, DOB, ID). The Company does not store government ID numbers.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-lg font-orbitron font-bold text-white">6. Tax Responsibility</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Users are solely responsible for determining and fulfilling any tax obligations. The Company does not provide tax advice.
              </p>
            </section>
            <section className="space-y-2">
               <h2 className="text-lg font-orbitron font-bold text-white">7. Payout Structure</h2>
               <p className="text-sm text-slate-400 leading-relaxed">
                 Payouts are processed through a third-party provider and may be subject to review. Large prizes may be distributed over time.
               </p>
            </section>
        </div>
      </div>

      <div className="h-px bg-white/5"></div>

      <section className="space-y-4 bg-red-950/10 p-6 rounded-xl border border-red-900/30">
        <h2 className="text-xl font-orbitron font-bold text-red-400 flex items-center gap-2">
           <AlertTriangle size={20} /> 8. Fraud & Anti-Cheat Policy
        </h2>
        <p className="text-sm text-slate-300">The use of chess engines, scripts, external assistance, collusion, or manipulation is strictly prohibited.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <span className="text-xs font-bold text-red-300 uppercase block mb-1">Indicators</span>
            <ul className="list-disc pl-4 text-xs text-slate-400">
               <li>Engine-like accuracy patterns</li>
               <li>Abnormal timing behavior</li>
               <li>Unexplained performance spikes</li>
            </ul>
          </div>
          <div>
            <span className="text-xs font-bold text-red-300 uppercase block mb-1">Consequences</span>
            <ul className="list-disc pl-4 text-xs text-slate-400">
               <li>Forfeiture of winnings</li>
               <li>Account suspension</li>
               <li>Permanent bans</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/5"></div>

      <section className="space-y-4">
         <h2 className="text-lg font-orbitron font-bold text-white">General Provisions</h2>
         <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
            <p>
              <strong>9. Credits & Payments:</strong> Minimum credit purchase is $10. Credits are non-refundable. Chargebacks result in termination.
            </p>
            <p>
              <strong>10. International Restrictions:</strong> Users are responsible for ensuring participation is lawful in their jurisdiction.
            </p>
            <p>
              <strong>11. Intellectual Property:</strong> All Platform software and content are the exclusive property of the Company.
            </p>
            <p>
              <strong>12. Account Termination:</strong> The Company may suspend accounts for violations including fraud, abuse, or cheating.
            </p>
            <p>
              <strong>13. Disclaimers:</strong> The Platform is provided "AS IS." We make no guarantees regarding outcomes or AI behavior.
            </p>
            <p>
              <strong>14. Limitation of Liability:</strong> Liability shall not exceed the entry fee paid.
            </p>
            <p>
              <strong>15. Governing Law:</strong> These Terms are governed by the laws of the State of Delaware.
            </p>
            <p>
              <strong>16. Changes to Terms:</strong> The Company may update these Terms at any time. Continued use constitutes acceptance. Material changes to jackpot mechanics or payout structures may require renewed user acceptance prior to continued participation in paid gameplay.
            </p>
         </div>
      </section>
    </div>
  );
};