import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, CheckCircle2, Shield, Lock, Activity, Database, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Scenario {
  id: string;
  text: string;
  correctPillar: 'C' | 'I' | 'A';
  explanation: string;
}

const SCENARIOS: Scenario[] = [
  { 
    id: 's1', 
    text: 'A hacker steals your password and reads your private emails.', 
    correctPillar: 'C',
    explanation: 'Passwords and encryption protect our secrets, keeping data Confidential.'
  },
  { 
    id: 's2', 
    text: 'A virus attacks a popular website so nobody can visit it for hours.', 
    correctPillar: 'A',
    explanation: 'A website must be Available for people to use it. When it goes down, Availability is broken.'
  },
  { 
    id: 's3', 
    text: 'A student sneaks into the school computer and changes their F grade to an A.', 
    correctPillar: 'I',
    explanation: 'Data must be accurate and untampered to keep its Integrity.'
  },
  { 
    id: 's4', 
    text: 'A doctor locks patient medical records in a secure safe.', 
    correctPillar: 'C',
    explanation: 'Locking private information ensures Confidentiality so only authorized people see it.'
  },
  { 
    id: 's5', 
    text: 'A hospital does daily backups of their computers just in case of a crash.', 
    correctPillar: 'A',
    explanation: 'Backups ensure that if a computer crashes, the data is still Available later.'
  }
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('sentinel_sound_muted') === 'true';
  }

  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('sentinel_sound_muted', muted ? 'true' : 'false');
  }

  public getMuted() { return this.isMuted; }

  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      });
    } catch {}
  }

  public playIncorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.2);
    } catch {}
  }
}

const sound = new SoundManager();

export default function Modul1Game() {
  const [gameState, setGameState] = useState<'PLAYING' | 'EXPLANATION' | 'WON'>('PLAYING');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [errorHighlight, setErrorHighlight] = useState<string | null>(null);

  const activeScenario = SCENARIOS[currentIdx];

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const handleSelection = (pillar: 'C' | 'I' | 'A') => {
    if (pillar === activeScenario.correctPillar) {
      sound.playSuccess();
      setGameState('EXPLANATION');
    } else {
      sound.playIncorrect();
      setErrorHighlight(pillar);
      setTimeout(() => setErrorHighlight(null), 500);
    }
  };

  const handleNext = () => {
    sound.playClick();
    if (currentIdx < SCENARIOS.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setGameState('PLAYING');
    } else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#f59e0b', '#fbbf24'] });
      setGameState('WON');
    }
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-yellow-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(245,158,11,0.25)] select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 01 // The Core Pillars
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-yellow-400 bg-yellow-950/30 px-2.5 py-1 rounded border border-yellow-500/20 font-bold uppercase tracking-wider">
            Packet {currentIdx + 1} of {SCENARIOS.length}
          </span>
          <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-yellow-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {(gameState === 'PLAYING' || gameState === 'EXPLANATION') && (
            <motion.div 
              key="playing" 
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left Panel: Education (Simplified) */}
              <div className="lg:col-span-5 space-y-4 text-sm font-sans flex flex-col">
                <div className="bg-[#0d061a] border border-cyber-border p-5 rounded-lg text-slate-300 flex-1 space-y-4">
                  <h2 className="text-yellow-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    The CIA Triad
                  </h2>
                  <p>
                    Every part of cybersecurity is built on three simple pillars. We call it the <strong>CIA Triad</strong>.
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="flex items-center gap-2 font-mono font-bold text-blue-400 mb-1">
                        <Lock className="w-4 h-4" /> Confidentiality
                      </div>
                      <div className="text-xs text-slate-400">Keeping secrets a secret. Nobody should read your diary or your passwords!</div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 mb-1">
                        <Database className="w-4 h-4" /> Integrity
                      </div>
                      <div className="text-xs text-slate-400">Keeping data correct. Nobody should be able to secretly change your grades.</div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="flex items-center gap-2 font-mono font-bold text-purple-400 mb-1">
                        <Activity className="w-4 h-4" /> Availability
                      </div>
                      <div className="text-xs text-slate-400">Keeping things working. Websites and computers should turn on when you need them.</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 border border-yellow-500/30 bg-yellow-950/20 rounded-lg">
                    <span className="text-yellow-400 font-bold block mb-1 text-xs uppercase tracking-wider">Your Mission</span>
                    Read the Data Packet. Click the correct Vault (C, I, or A) that matches the scenario.
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Lab */}
              <div className="lg:col-span-7 flex flex-col gap-4 relative">
                
                {gameState === 'PLAYING' ? (
                  <>
                    {/* The Data Packet */}
                    <motion.div 
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-[#05010e] border-2 border-yellow-500/50 rounded-lg flex-1 flex flex-col items-center justify-center p-8 relative shadow-inner text-center min-h-[180px] hover:border-yellow-400 transition-colors"
                    >
                      <div className="flex items-center gap-2 absolute top-4 left-4 text-yellow-400 font-bold text-xs uppercase tracking-widest bg-yellow-950/40 px-3 py-1 rounded-full border border-yellow-500/30">
                        <FileText className="w-3 h-3" /> Data Packet
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed max-w-lg mt-4">
                        "{activeScenario.text}"
                      </p>
                    </motion.div>

                    {/* The Vaults */}
                    <div className="grid grid-cols-3 gap-4 h-32">
                      <button 
                        onClick={() => handleSelection('C')}
                        className={`border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:-translate-y-1 ${errorHighlight === 'C' ? 'border-red-500 bg-red-950/30 text-red-500' : 'border-blue-500/50 bg-[#0d061a] hover:bg-blue-900/30 hover:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]'}`}
                      >
                        <Lock className={`w-8 h-8 ${errorHighlight === 'C' ? 'text-red-500' : 'text-blue-400'}`} />
                        <span className={`font-mono font-bold tracking-widest uppercase text-sm ${errorHighlight === 'C' ? 'text-red-500' : 'text-blue-300'}`}>Vault C<br/><span className="text-[10px] text-slate-500">(Confidentiality)</span></span>
                      </button>
                      
                      <button 
                        onClick={() => handleSelection('I')}
                        className={`border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:-translate-y-1 ${errorHighlight === 'I' ? 'border-red-500 bg-red-950/30 text-red-500' : 'border-emerald-500/50 bg-[#0d061a] hover:bg-emerald-900/30 hover:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'}`}
                      >
                        <Database className={`w-8 h-8 ${errorHighlight === 'I' ? 'text-red-500' : 'text-emerald-400'}`} />
                        <span className={`font-mono font-bold tracking-widest uppercase text-sm ${errorHighlight === 'I' ? 'text-red-500' : 'text-emerald-300'}`}>Vault I<br/><span className="text-[10px] text-slate-500">(Integrity)</span></span>
                      </button>
                      
                      <button 
                        onClick={() => handleSelection('A')}
                        className={`border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:-translate-y-1 ${errorHighlight === 'A' ? 'border-red-500 bg-red-950/30 text-red-500' : 'border-purple-500/50 bg-[#0d061a] hover:bg-purple-900/30 hover:border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'}`}
                      >
                        <Activity className={`w-8 h-8 ${errorHighlight === 'A' ? 'text-red-500' : 'text-purple-400'}`} />
                        <span className={`font-mono font-bold tracking-widest uppercase text-sm ${errorHighlight === 'A' ? 'text-red-500' : 'text-purple-300'}`}>Vault A<br/><span className="text-[10px] text-slate-500">(Availability)</span></span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Feedback Explanation Overlay */
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-[#0d061a] border-2 border-green-500 rounded-lg p-8 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(34,197,94,0.2)] z-10"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-400 mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase font-mono">Correct Vault!</h3>
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg my-4 max-w-sm">
                      <p className="text-slate-300 text-sm italic mb-3">"{activeScenario.text}"</p>
                      <p className="text-green-400 font-bold text-base">{activeScenario.explanation}</p>
                    </div>
                    <button 
                      onClick={handleNext}
                      className="mt-4 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-colors shadow-lg"
                    >
                      Next Packet →
                    </button>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-yellow-500 rounded-lg p-6 shadow-[0_0_20px_rgba(245,158,11,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CheckCircle2 className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">TRIAD SECURED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Great job! You now understand the three main pillars that protect all our data.
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold uppercase cursor-pointer"
              >
                RETURN TO MENU
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
