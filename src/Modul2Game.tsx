import { useState, useEffect } from 'react';
import { motion as motion2, AnimatePresence as AnimatePresence2 } from 'framer-motion';
import { Volume2, VolumeX, Play, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Objective {
  id: number;
  goal: string;
  correctSeq: string[];
  hint: string;
}

const OBJECTIVES: Objective[] = [
  { id: 1, goal: "Create a folder named 'vault'", correctSeq: ['mkdir', 'vault'], hint: 'mkdir makes a new folder named after its parameter.' },
  { id: 2, goal: "View large file 'confession.log' page by page", correctSeq: ['less', 'confession.log'], hint: 'less pages large files so they do not overwhelm terminals.' },
  { id: 3, goal: "Recursively delete directory 'old_logs'", correctSeq: ['rm -r', 'old_logs'], hint: 'rm deletes, and -r option makes it recursive to clear subfolders.' },
  { id: 4, goal: "Long detailed listing with hidden parameters", correctSeq: ['ls', '-la'], hint: 'ls lists directories; -l is detail format, -a reveals hidden ones.' }
];

interface PipeBlock {
  code: string;
  label: string;
  type: 'cmd' | 'flag' | 'arg';
  leftJoint: 'flat' | 'round';
  rightJoint: 'flat' | 'round';
  color: string;
}

const BLOCKS: PipeBlock[] = [
  { code: 'mkdir', label: 'Make Directory', type: 'cmd', leftJoint: 'flat', rightJoint: 'round', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20' },
  { code: 'vault', label: 'Folder Parameter', type: 'arg', leftJoint: 'round', rightJoint: 'flat', color: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/20' },
  { code: 'less', label: 'Pager view', type: 'cmd', leftJoint: 'flat', rightJoint: 'round', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20' },
  { code: 'confession.log', label: 'File Parameter', type: 'arg', leftJoint: 'round', rightJoint: 'flat', color: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/20' },
  { code: 'rm -r', label: 'Recursive Delete', type: 'cmd', leftJoint: 'flat', rightJoint: 'round', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20' },
  { code: 'old_logs', label: 'Dir Parameter', type: 'arg', leftJoint: 'round', rightJoint: 'flat', color: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/20' },
  { code: 'ls', label: 'List Directory', type: 'cmd', leftJoint: 'flat', rightJoint: 'round', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20' },
  { code: '-la', label: 'Flags: Long + All', type: 'flag', leftJoint: 'round', rightJoint: 'round', color: 'text-blue-400 border-blue-500/50 bg-blue-950/20' }
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

  public playSlide() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  public playIncorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
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
      [330, 440, 554, 659].forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
      });
    } catch {}
  }
}

const sound = new SoundManager();

export default function Modul2Game() {
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'WON'>('INTRO');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [activeIdx, setActiveIdx] = useState(0);

  // Track slots (Pipeline holds 2 blocks)
  const [trackSlots, setTrackSlots] = useState<(PipeBlock | null)[]>([null, null]);
  const [marbleRunning, setMarbleRunning] = useState(false);
  const [marbleProgress, setMarbleProgress] = useState(0); // 0 to 100
  const [marbleYOffset, setMarbleYOffset] = useState(0); // for drops/leaks
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [jointsAligned, setJointsAligned] = useState<boolean[]>([false, false, false]); // Joint 0 (Emitter-Slot0), Joint 1 (Slot0-Slot1), Joint 2 (Slot1-Receiver)

  const activeObj = OBJECTIVES[activeIdx];

  // Recalculate joint alignments when slot contents change
  useEffect(() => {
    const s0 = trackSlots[0];
    const s1 = trackSlots[1];

    const j0 = s0 ? s0.leftJoint === 'flat' : false; // Start emitter is flat output
    const j1 = s0 && s1 ? s0.rightJoint === s1.leftJoint : false; // Interlock check
    const j2 = s1 ? s1.rightJoint === 'flat' : false; // End receiver is flat input

    setJointsAligned([j0, j1, j2]);
    setFeedback(null);
    setMarbleProgress(0);
    setMarbleYOffset(0);
    setMarbleRunning(false);
  }, [trackSlots]);

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
    sound.playClick();
  };

  const handleBlockClick = (block: PipeBlock) => {
    if (marbleRunning) return;
    const emptyIdx = trackSlots.indexOf(null);
    if (emptyIdx === -1) return;

    sound.playClick();
    setTrackSlots(prev => {
      const next = [...prev];
      next[emptyIdx] = block;
      return next;
    });
  };

  const handleRemoveBlock = (idx: number) => {
    if (marbleRunning) return;
    sound.playClick();
    setTrackSlots(prev => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const handleLaunchMarble = () => {
    if (trackSlots.some(s => s === null)) {
      sound.playIncorrect();
      setFeedback({ type: 'error', text: 'PIPELINE HOLE: Please place blocks in all slots before launching.' });
      return;
    }

    sound.playSlide();
    setMarbleRunning(true);
    setMarbleProgress(0);
    setMarbleYOffset(0);
    setFeedback(null);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setMarbleProgress(currentProgress);

      // Check failure trigger points
      // Joint 0: checked around 25% progress
      if (currentProgress >= 25 && currentProgress < 50 && !jointsAligned[0]) {
        clearInterval(interval);
        triggerFailure(0, currentProgress);
      }
      // Joint 1: checked around 55% progress
      else if (currentProgress >= 55 && currentProgress < 80 && !jointsAligned[1]) {
        clearInterval(interval);
        triggerFailure(1, currentProgress);
      }
      // Joint 2: checked around 85% progress
      else if (currentProgress >= 85 && currentProgress < 100 && !jointsAligned[2]) {
        clearInterval(interval);
        triggerFailure(2, currentProgress);
      }
      // Success endpoint
      else if (currentProgress >= 100) {
        clearInterval(interval);
        verifySequence();
      }
    }, 30);
  };

  const triggerFailure = (jointIdx: number, _failProgress: number) => {
    sound.playIncorrect();
    
    // Simulate drop physics animation
    let frames = 0;
    const dropInterval = setInterval(() => {
      frames += 1;
      setMarbleYOffset(prev => prev + (frames * 1.5)); // acceleration downwards
      if (frames > 20) {
        clearInterval(dropInterval);
        setMarbleRunning(false);
        if (jointIdx === 0) {
          setFeedback({ type: 'error', text: 'Oops! The command must start with a valid command block (like mkdir), not a file or folder.' });
        } else if (jointIdx === 1) {
          setFeedback({ type: 'error', text: 'Oops! These blocks do not fit together. Usually, you need a command first, and then the target it acts upon.' });
        } else {
          setFeedback({ type: 'error', text: 'Oops! The blocks did not connect to the end properly.' });
        }
      }
    }, 20);
  };

  const verifySequence = () => {
    const s0 = trackSlots[0];
    const s1 = trackSlots[1];
    if (!s0 || !s1) return;

    const userSeq = [s0.code, s1.code];
    const correct = userSeq.length === activeObj.correctSeq.length &&
                    userSeq.every((code, idx) => code === activeObj.correctSeq[idx]);

    setMarbleRunning(false);
    if (correct) {
      sound.playSuccess();
      setFeedback({ type: 'success', text: `Success! You built the correct command. ${activeObj.hint}` });
    } else {
      sound.playIncorrect();
      setFeedback({ type: 'error', text: 'The blocks fit together, but they do not solve the goal. Try reading the hint!' });
      setMarbleProgress(0);
    }
  };

  const handleNextLevel = () => {
    sound.playClick();
    if (activeIdx < OBJECTIVES.length - 1) {
      setActiveIdx(prev => prev + 1);
    } else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#10b981', '#34d399'] });
      setGameState('WON');
    }
  };

  // Helper to render connector joint visual
  const renderJointIndicator = (aligned: boolean) => {
    return (
      <div className={`w-3.5 h-7 rounded-sm flex items-center justify-center transition-all duration-300 ${
        aligned ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500/30 border border-red-500/50'
      }`}>
        <div className={`w-1 h-3 rounded-full ${aligned ? 'bg-white' : 'bg-red-500'}`} />
      </div>
    );
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-4xl bg-cyber-bg border-2 border-emerald-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.25)] font-mono text-slate-200 select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 02 // Building Commands
        </span>
        <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-emerald-400 cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence2 mode="wait">
          
          {gameState === 'INTRO' && (
            <motion2.div 
              key="intro" 
              className="space-y-6 text-center max-w-xl mx-auto py-10" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <span className="text-emerald-400 text-xl">⚙️</span>
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-widest">Building Commands</h1>
              <p className="text-slate-300 font-sans text-sm leading-relaxed">
                Connect the blocks to build a working terminal command. Think of it like connecting a verb (the command) to a noun (the file or folder). Press Launch to test it!
              </p>
              <button onClick={() => { sound.playClick(); setGameState('PLAYING'); }} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase cursor-pointer">
                START LAB
              </button>
            </motion2.div>
          )}

          {gameState === 'PLAYING' && (
            <motion2.div 
              key="playing" 
              className="grid grid-cols-1 lg:grid-cols-3 gap-5" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              
              {/* Blocks selector */}
              <div className="bg-[#0d061a] border border-cyber-border p-4 rounded-lg space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">PIPE INVENTORY</span>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {BLOCKS.map(block => {
                    const used = trackSlots.some(s => s?.code === block.code);
                    return (
                      <button
                        key={block.code}
                        onClick={() => handleBlockClick(block)}
                        disabled={used || marbleRunning}
                        className={`p-2 rounded border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          used 
                            ? 'opacity-20 border-transparent bg-slate-900 text-slate-600 cursor-not-allowed' 
                            : 'bg-slate-950 border-cyber-border hover:border-emerald-500 text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold font-mono">{block.code}</span>
                          <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-slate-500 uppercase">{block.type}</span>
                        </div>
                        <div className="flex items-center justify-between w-full mt-2 border-t border-slate-900/60 pt-1 text-[8px] text-slate-500">
                          <span>Left: {block.leftJoint}</span>
                          <span>Right: {block.rightJoint}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid marble pipeline */}
              <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                <div className="bg-slate-950 border border-cyber-border rounded-lg p-5 flex-1 flex flex-col justify-between relative overflow-hidden min-h-[250px]">
                  <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>

                  {/* Objective briefs */}
                  <div className="bg-emerald-950/15 border border-emerald-500/20 p-3 rounded text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold block uppercase text-[9px] mb-0.5">YOUR GOAL</span>
                    {activeObj.goal}
                  </div>

                  {/* Physics Marble Run Track */}
                  <div className="my-6 flex items-center justify-between border border-[#23123a] bg-black/40 rounded-lg p-4 relative h-28">
                    
                    {/* Start emitter */}
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-500 flex flex-col items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        <span className="text-[8px] text-slate-400 block font-sans">EMITTER</span>
                        <span className="text-[9px] text-emerald-400 font-bold">START</span>
                      </div>
                      <div className="w-2.5 h-5 bg-emerald-500 rounded-r-md" /> {/* Flat output */}
                    </div>

                    {renderJointIndicator(jointsAligned[0])}

                    {/* Track slots */}
                    <div className="flex-1 flex gap-2 px-2 items-center">
                      {trackSlots.map((block, idx) => (
                        <div key={idx} className="flex-1 flex items-center gap-1">
                          <div
                            onClick={() => handleRemoveBlock(idx)}
                            className={`h-16 flex-1 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                              block 
                                ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                                : 'border-cyber-border bg-[#0d061a] hover:border-slate-800'
                            }`}
                          >
                            {block ? (
                              <div className="w-full px-1">
                                <span className="text-xs font-bold font-mono block truncate">{block.code}</span>
                                <span className="text-[8px] text-slate-500 block font-sans mt-1">EJECT</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600 uppercase">PIPE {idx + 1}</span>
                            )}
                          </div>
                          {idx === 0 && renderJointIndicator(jointsAligned[1])}
                        </div>
                      ))}
                    </div>

                    {renderJointIndicator(jointsAligned[2])}

                    {/* End receiver */}
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-5 bg-emerald-500 rounded-l-md" /> {/* Flat input */}
                      <div className="w-12 h-12 rounded-lg bg-[#0d061a] border border-[#23123a] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] text-slate-500 block font-sans">COMPILER</span>
                        <span className="text-[9px] text-slate-500 font-bold">END</span>
                      </div>
                    </div>

                    {/* Rolling marble ball visual overlay */}
                    {marbleRunning && (
                      <motion2.div
                        className="absolute w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] z-20"
                        style={{ 
                          top: `calc(50% - 8px + ${marbleYOffset}px)`, 
                          left: `calc(10% + ${marbleProgress * 0.76}% - 8px)` 
                        }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      />
                    )}
                  </div>
                </div>

                {/* Feedback console */}
                <div className="bg-slate-950 border border-cyber-border rounded-lg p-3 h-16 flex items-center justify-start">
                  {feedback ? (
                    <div className="flex items-start gap-2.5 text-xs text-slate-300">
                      {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                      )}
                      <span className="font-mono leading-relaxed">{feedback.text}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 font-sans">Connect the command blocks together and launch the marble to test if they fit.</span>
                  )}
                </div>

                {/* launcher control */}
                <div className="flex justify-end pt-1">
                  {!feedback || feedback.type === 'error' ? (
                    <button
                      onClick={handleLaunchMarble}
                      disabled={marbleRunning}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4" /> LAUNCH MARBLE
                    </button>
                  ) : (
                    <button
                      onClick={handleNextLevel}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      PROCEED TO NEXT PIPELINE <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion2.div>
          )}

          {gameState === 'WON' && (
            <motion2.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-emerald-500 rounded-lg p-6 shadow-[0_0_20px_rgba(16,185,129,0.35)] text-center space-y-5" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">COMMANDS MASTERED</h2>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Great job! You learned how to combine commands and targets to make the computer do what you want.
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase cursor-pointer"
              >
                RETURN TO ACCESS PORTAL
              </button>
            </motion2.div>
          )}
        </AnimatePresence2>
      </div>
    </div>
  );
}
