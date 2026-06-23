import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, CheckCircle2, FileText, FileSearch, ArrowDownToLine, ArrowUpToLine, Wrench } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Task {
  id: number;
  question: string;
  correctTool: 'cat' | 'less' | 'head' | 'tail';
  fileContext: string;
  successOutput: React.ReactNode;
  failMessage: string;
}

const TASKS: Task[] = [
  { 
    id: 1, 
    question: "We found a tiny 3-line file named briefing.txt. We just need to dump its contents to the screen quickly.", 
    correctTool: 'cat',
    fileContext: "briefing.txt (Small File)",
    successOutput: <div className="font-mono text-blue-300">Operation Blackout planning has begun.<br/>All agents on standby.<br/>End of message.</div>,
    failMessage: "For tiny files, you just want to concatenate them straight to the terminal."
  },
  { 
    id: 2, 
    question: "We intercepted intel_report.log. It's massive. We just need to verify its header at the very beginning to see what type of file it is.", 
    correctTool: 'head',
    fileContext: "intel_report.log (50,000 Lines)",
    successOutput: <div className="font-mono text-blue-300">== TOP SECRET INTEL ==<br/>Classification: ALPHA<br/>Sector: 7G<br/>...</div>,
    failMessage: "Remember, we only want the top of the file."
  },
  { 
    id: 3, 
    question: "The server is actively being attacked! We need to see the latest entries continuously being added to the very end of auth.log.", 
    correctTool: 'tail',
    fileContext: "auth.log (Live Monitor)",
    successOutput: <div className="font-mono text-blue-300">14:05:11 Failed password for root<br/>14:05:12 Failed password for root<br/><span className="text-red-400 font-bold animate-pulse">14:05:13 BRUTE FORCE DETECTED</span></div>,
    failMessage: "We need to look at the bottom, not the top or the whole file."
  },
  { 
    id: 4, 
    question: "We need to carefully search through hundreds of thousands of lines in server.log to find a specific keyword without overwhelming our terminal.", 
    correctTool: 'less',
    fileContext: "server.log (500,000 Lines)",
    successOutput: <div className="font-mono text-blue-300 border border-blue-500/50 p-2 rounded bg-black relative"><div className="absolute top-1 right-2 text-[10px] text-slate-500">INTERACTIVE PAGER</div>/keyword_search<br/>...<br/>Match found on line 402,119: "keyword"<br/><span className="bg-slate-800 px-1">~</span><br/><span className="bg-slate-800 px-1">:</span></div>,
    failMessage: "If you use cat or head/tail, you can't interactively scroll and search through a massive file!"
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

  public playError() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      [349.23, 440.00, 523.25].forEach((freq, idx) => {
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
}

const sound = new SoundManager();

export default function Modul4Game() {
  const [gameState, setGameState] = useState<'PLAYING' | 'WON'>('PLAYING');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessFor, setShowSuccessFor] = useState<number | null>(null);

  const activeTask = TASKS[currentTaskIdx];

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const handleToolSelect = (tool: 'cat' | 'less' | 'head' | 'tail') => {
    if (showSuccessFor !== null) return; // Prevent clicking while animating success

    if (tool === activeTask.correctTool) {
      sound.playClick();
      setShowSuccessFor(activeTask.id);
      setErrorMsg(null);
      
      setTimeout(() => {
        if (currentTaskIdx < TASKS.length - 1) {
          setCurrentTaskIdx(prev => prev + 1);
          setShowSuccessFor(null);
        } else {
          sound.playSuccess();
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#3b82f6', '#60a5fa'] });
          setGameState('WON');
        }
      }, 2500);
    } else {
      sound.playError();
      setErrorMsg(activeTask.failMessage);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-blue-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(59,130,246,0.25)] select-none transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 04 // Viewing Files
        </span>
        <div className="flex items-center gap-3">
          {gameState === 'PLAYING' && (
            <span className="text-[10px] text-blue-400 bg-blue-950/30 px-2.5 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider">
              Task {currentTaskIdx + 1} of {TASKS.length}
            </span>
          )}
          <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-blue-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {gameState === 'PLAYING' && (
            <motion.div 
              key="playing" 
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left Panel: Education */}
              <div className="lg:col-span-4 space-y-4 text-sm font-sans flex flex-col">
                <div className="bg-[#0d061a] border border-cyber-border p-5 rounded-lg text-slate-300 flex-1 space-y-4">
                  <h2 className="text-blue-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileSearch className="w-5 h-5" />
                    File Viewer Toolkit
                  </h2>
                  <p>
                    Simply locating a file is not enough. You must understand what is inside it. But a single log file may contain 50,000 lines!
                  </p>
                  <p>
                    You must choose the right tool for the job:
                  </p>
                  
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-900/40 text-blue-400 font-bold px-2 py-1 rounded text-xs mt-1 w-12 text-center">cat</div>
                      <div className="text-xs text-slate-400">Dumps everything to the screen at once. Best for <strong>small files</strong>.</div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-900/40 text-blue-400 font-bold px-2 py-1 rounded text-xs mt-1 w-12 text-center">less</div>
                      <div className="text-xs text-slate-400">Interactive viewer. Best for scrolling and searching <strong>very large files</strong>.</div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-900/40 text-blue-400 font-bold px-2 py-1 rounded text-xs mt-1 w-12 text-center">head</div>
                      <div className="text-xs text-slate-400">Shows the <strong>beginning</strong> (first 10 lines) of a file. Good for headers.</div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-900/40 text-blue-400 font-bold px-2 py-1 rounded text-xs mt-1 w-12 text-center">tail</div>
                      <div className="text-xs text-slate-400">Shows the <strong>end</strong> (last 10 lines) of a file. Good for recent log entries.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Toolkit */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                <div className="bg-[#05010e] border border-cyber-border rounded-lg flex-1 overflow-hidden flex flex-col relative p-6">
                  
                  {/* Task Display */}
                  <div className="bg-slate-900 border border-blue-500/30 p-5 rounded-lg mb-6 shadow-md relative min-h-[140px] flex flex-col justify-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50"></div>
                    <span className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4" /> Current Objective
                    </span>
                    <p className="text-slate-200 font-sans text-base leading-relaxed">
                      "{activeTask.question}"
                    </p>
                    <div className="mt-3 text-xs text-slate-500 font-mono flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Target: {activeTask.fileContext}
                    </div>
                  </div>

                  {/* Tool Selection Grid */}
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <button 
                      onClick={() => handleToolSelect('cat')}
                      className="border-2 border-slate-700 bg-slate-900/50 hover:bg-blue-900/20 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center transition-all group"
                    >
                      <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2" />
                      <span className="font-mono font-bold text-lg text-slate-300 group-hover:text-white">cat</span>
                    </button>
                    <button 
                      onClick={() => handleToolSelect('less')}
                      className="border-2 border-slate-700 bg-slate-900/50 hover:bg-blue-900/20 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center transition-all group"
                    >
                      <FileSearch className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2" />
                      <span className="font-mono font-bold text-lg text-slate-300 group-hover:text-white">less</span>
                    </button>
                    <button 
                      onClick={() => handleToolSelect('head')}
                      className="border-2 border-slate-700 bg-slate-900/50 hover:bg-blue-900/20 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center transition-all group"
                    >
                      <ArrowUpToLine className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2" />
                      <span className="font-mono font-bold text-lg text-slate-300 group-hover:text-white">head</span>
                    </button>
                    <button 
                      onClick={() => handleToolSelect('tail')}
                      className="border-2 border-slate-700 bg-slate-900/50 hover:bg-blue-900/20 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center transition-all group"
                    >
                      <ArrowDownToLine className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2" />
                      <span className="font-mono font-bold text-lg text-slate-300 group-hover:text-white">tail</span>
                    </button>
                  </div>

                  {/* Overlays */}
                  <AnimatePresence>
                    {errorMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute bottom-6 left-6 right-6 bg-red-950/90 border border-red-500 p-4 rounded text-center shadow-lg"
                      >
                        <span className="text-red-400 font-bold block mb-1">INCORRECT TOOL</span>
                        <span className="text-slate-200 text-sm">{errorMsg}</span>
                      </motion.div>
                    )}

                    {showSuccessFor === activeTask.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-8 text-center"
                      >
                        <CheckCircle2 className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
                        <h3 className="text-blue-400 font-bold tracking-widest uppercase mb-4">Data Extracted Successfully</h3>
                        {activeTask.successOutput}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

              </div>
            </motion.div>
          )}

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-blue-500 rounded-lg p-6 shadow-[0_0_20px_rgba(59,130,246,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <FileSearch className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">TOOLKIT MASTERED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Excellent work. You now know exactly when to use <code>cat</code>, <code>less</code>, <code>head</code>, and <code>tail</code> to extract intelligence from any file size.
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold uppercase cursor-pointer"
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
