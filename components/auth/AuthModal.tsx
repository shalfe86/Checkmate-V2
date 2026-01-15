import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Mail, Lock, Loader2, User, Globe, ScrollText, CheckCircle2 } from 'lucide-react';
import { TermsBody } from '../legal/TermsBody';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  
  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('US');
  
  // Consent State
  const [agreed18, setAgreed18] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Terms Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false);
  const termsContentRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showTermsModal) {
      setCanAcceptTerms(false);
    }
  }, [showTermsModal]);

  if (!isOpen) return null;

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setCanAcceptTerms(true);
    }
  };

  const handleAcceptTerms = () => {
    setAgreedTerms(true);
    setShowTermsModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        if (!agreed18) throw new Error("You must confirm you are at least 18 years old");
        if (!agreedTerms) throw new Error("You must review and agree to the Terms of Service");
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              country_code: country,
              avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${username}`
            }
          }
        });
        
        if (signUpError) throw signUpError;
        alert('Registration successful! Please check your email to confirm your account.');
        onClose();
        
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onClose();
      }
    } catch (err: any) {
      // In offline/demo mode, regular auth often fails.
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md bg-slate-950 border border-yellow-500/30 rounded-xl shadow-[0_0_40px_rgba(234,179,8,0.1)] overflow-hidden max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
            <h2 className="text-xl font-orbitron text-white">
              {mode === 'login' ? 'ACCESS TERMINAL' : 'NEW OPERATOR'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-xs font-mono">
                  {error}
                </div>
              )}
              
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400 uppercase">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input 
                      type="text" 
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                      placeholder="ChessWiz"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-slate-400 uppercase">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input 
                        type="password" 
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase">Confirm</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input 
                          type="password" 
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
              </div>

              {mode === 'signup' && (
                <>
                   <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase">Country of Residence</label>
                      <div className="relative">
                         <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                         <select 
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors appearance-none"
                         >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                         </select>
                      </div>
                   </div>

                   <div className="pt-2 space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                         <input 
                           type="checkbox" 
                           checked={agreed18}
                           onChange={(e) => setAgreed18(e.target.checked)}
                           className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-yellow-500 focus:ring-yellow-500/50 focus:ring-offset-0"
                         />
                         <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                           I confirm I am at least 18 years old.
                         </span>
                      </label>

                      <div className="flex items-start gap-3 group">
                         <div className="mt-1 relative">
                            <input 
                              type="checkbox" 
                              checked={agreedTerms}
                              disabled
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-yellow-500 opacity-50 cursor-not-allowed"
                            />
                            {agreedTerms && (
                               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <CheckCircle2 size={16} className="text-yellow-500" />
                               </div>
                            )}
                         </div>
                         <div className="text-xs text-slate-400">
                           <span>I agree to the </span>
                           <button 
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="text-yellow-500 hover:underline font-bold"
                           >
                              Terms of Service
                           </button>
                           {!agreedTerms && (
                              <div className="mt-2">
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => setShowTermsModal(true)}
                                  className="h-7 text-[10px]"
                                >
                                  <ScrollText size={12} className="mr-1" />
                                  REVIEW TERMS
                                </Button>
                              </div>
                           )}
                         </div>
                      </div>
                   </div>
                </>
              )}

              <Button type="submit" className="w-full mt-6 font-orbitron tracking-widest" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (mode === 'login' ? 'AUTHENTICATE' : 'INITIATE')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                {mode === 'login' ? "Don't have an account? " : "Already have an ID? "}
                <button 
                  onClick={handleModeSwitch}
                  className="text-yellow-500 hover:underline font-semibold"
                >
                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-[80vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl relative">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
               <h3 className="font-orbitron font-bold text-white flex items-center gap-2">
                  <ScrollText size={18} className="text-yellow-500" />
                  TERMS OF SERVICE REVIEW
               </h3>
               <button onClick={() => setShowTermsModal(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
               </button>
            </div>
            
            <div 
              className="flex-1 overflow-y-auto p-6 scroll-smooth"
              onScroll={handleTermsScroll}
              ref={termsContentRef}
            >
               <TermsBody />
               <div className="h-12"></div> {/* Spacer for scrolling */}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 rounded-b-xl flex flex-col md:flex-row justify-between items-center gap-4">
               <span className="text-xs text-slate-500">
                  {canAcceptTerms ? "Thank you for reviewing." : "Please scroll to the bottom to accept."}
               </span>
               <div className="flex gap-2 w-full md:w-auto">
                 <Button variant="ghost" onClick={() => setShowTermsModal(false)} className="flex-1 md:flex-none">
                    Cancel
                 </Button>
                 <Button 
                    onClick={handleAcceptTerms} 
                    disabled={!canAcceptTerms}
                    className={`flex-1 md:flex-none ${!canAcceptTerms ? 'opacity-50 cursor-not-allowed' : 'gold-btn'}`}
                 >
                    I ACCEPT THE TERMS
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};