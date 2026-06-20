import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw, ChevronRight, CheckCircle2, ArrowRight, Server, Laptop, HelpCircle, FileText, Image, Palette, Check, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// SYNTHESIZED SOUND SYSTEM (Web Audio API)
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('sentinel_sound_muted');
    this.isMuted = savedMute === 'true';
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('sentinel_sound_muted', muted ? 'true' : 'false');
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn(e);
    }
  }

  public playSnap() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn(e);
    }
  }

  public playIncorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn(e);
    }
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [330.00, 392.00, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

const sound = new SoundManager();

// ==========================================
// BACKGROUND VISUAL OVERLAY
// ==========================================
const TelemetryOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg">
      <div className="absolute inset-0 cyber-grid opacity-30"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500/5 shadow-[0_0_6px_rgba(162,88,255,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-purple-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-purple-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-purple-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-purple-500/20"></div>
    </div>
  );
};

// ==========================================
// TYPES & CONSTANTS
// ==========================================
type Round = 'INTRO' | 'ROUND_1' | 'ROUND_2' | 'ROUND_3' | 'ROUND_4' | 'FINAL';

interface FileCard {
  id: string;
  name: string;
  type: 'homepage' | 'images' | 'styles';
  delivered: boolean;
  color: string;
}

export default function Modul6Game() {
  const [round, setRound] = useState<Round>('INTRO');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  // Scoring / validation state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Round 2 Drag State
  const [requestDelivered, setRequestDelivered] = useState(false);
  const [isDraggingPackage, setIsDraggingPackage] = useState(false);

  // Round 3 Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Round 4 Floating Cards State
  const [files, setFiles] = useState<FileCard[]>([
    { id: 'home', name: 'Homepage (HTML)', type: 'homepage', delivered: false, color: 'border-blue-500 text-blue-400 bg-blue-950/20' },
    { id: 'img', name: 'Images (Assets)', type: 'images', delivered: false, color: 'border-green-500 text-green-400 bg-green-950/20' },
    { id: 'css', name: 'Styles (CSS)', type: 'styles', delivered: false, color: 'border-yellow-500 text-yellow-400 bg-yellow-950/20' },
  ]);

  // Toggle audio state
  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const handleStartGame = () => {
    sound.playClick();
    setRound('ROUND_1');
    resetRoundStates();
  };

  const resetRoundStates = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setRequestDelivered(false);
    setIsProcessing(false);
    setProcessingProgress(0);
    setFiles([
      { id: 'home', name: 'Homepage (HTML)', type: 'homepage', delivered: false, color: 'border-blue-500 text-blue-400 bg-blue-950/20' },
      { id: 'img', name: 'Images (Assets)', type: 'images', delivered: false, color: 'border-green-500 text-green-400 bg-green-950/20' },
      { id: 'css', name: 'Styles (CSS)', type: 'styles', delivered: false, color: 'border-yellow-500 text-yellow-400 bg-yellow-950/20' },
    ]);
  };

  // Evaluate Round 1 Selection
  const handleRound1Select = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === 'request') {
      sound.playSuccess();
      setIsCorrect(true);
    } else {
      sound.playIncorrect();
      setIsCorrect(false);
    }
  };

  // Proceed to next stage
  const handleNextRound = () => {
    sound.playClick();
    if (round === 'ROUND_1') {
      setRound('ROUND_2');
    } else if (round === 'ROUND_2') {
      setRound('ROUND_3');
    } else if (round === 'ROUND_3') {
      setRound('ROUND_4');
    } else if (round === 'ROUND_4') {
      setRound('FINAL');
      // trigger confetti at the end!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#a258ff', '#10b981', '#3b82f6']
      });
    }
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(null);
  };

  // Round 2 drag validation
  const handleRequestDragEnd = (_event: any, info: any) => {
    // If dragged rightwards towards Server
    if (info.offset.x > 140) {
      sound.playSuccess();
      setRequestDelivered(true);
    } else {
      sound.playClick();
    }
    setIsDraggingPackage(false);
  };

  // Evaluate Round 3 Selection
  const handleRound3Select = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === 'send') {
      sound.playSuccess();
      setIsCorrect(true);
      setIsProcessing(true);
      // Simulate file retrieval progress bar
      let currentVal = 0;
      const interval = setInterval(() => {
        currentVal += 10;
        setProcessingProgress(currentVal);
        if (currentVal >= 100) {
          clearInterval(interval);
        }
      }, 150);
    } else {
      sound.playIncorrect();
      setIsCorrect(false);
    }
  };

  // Round 4 drag to browser handler
  const handleFileDragEnd = (id: string, info: any) => {
    // Leftward drag from Server (right side) to Browser (left side)
    if (info.offset.x < -140) {
      sound.playSnap();
      setFiles(prev =>
        prev.map(f => (f.id === id ? { ...f, delivered: true } : f))
      );
    } else {
      sound.playClick();
    }
  };

  const deliveredCount = files.filter(f => f.delivered).length;
  const progressPercent = Math.round((deliveredCount / files.length) * 100);

  return (
    <div className="relative min-h-[600px] w-full max-w-4xl bg-cyber-bg border-2 border-[#23123a] rounded-lg p-6 overflow-hidden flex flex-col justify-between shadow-[0_0_20px_rgba(162,88,255,0.15)] font-mono text-slate-200">
      <TelemetryOverlay />

      {/* HEADER HUD */}
      <div className="relative z-10 flex justify-between items-center border-b border-[#23123a] pb-3 mb-4 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping"></span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Assessment Node 06 // Network Operator
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded border border-[#23123a] text-slate-400 hover:text-purple-400 hover:border-purple-500 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* LEFT COLUMN: VISUAL JOURNEY FLOW CHART */}
        <div className="lg:col-span-1 bg-[#0d061a]/90 border border-[#23123a] rounded-lg p-4 flex flex-col justify-between select-none">
          <div className="space-y-4">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block border-b border-[#23123a] pb-1.5">
              Journey Pipeline
            </span>

            <div className="flex flex-col items-center space-y-2 py-4">
              {/* NODE: USER */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-8 rounded border border-purple-500/30 flex items-center justify-center text-xs bg-purple-950/20 text-purple-300 font-bold shadow-sm">
                  USER
                </div>
                <div className="h-4 w-[1px] border-r border-dashed border-purple-500/40"></div>
              </div>

              {/* NODE: BROWSER */}
              <div className="flex flex-col items-center">
                <div className={`w-20 h-10 rounded border flex flex-col items-center justify-center text-xs font-bold transition-all ${round !== 'INTRO' ? 'border-purple-500 bg-purple-950/30 text-white text-glow-purple' : 'border-purple-500/20 bg-slate-900/40 text-slate-500'}`}>
                  <Laptop className="w-3.5 h-3.5 mb-0.5" />
                  BROWSER
                </div>
                <div className="h-4 w-[1px] border-r border-dashed border-purple-500/40"></div>
              </div>

              {/* NODE: REQUEST */}
              <div className="flex flex-col items-center">
                <div className={`w-20 h-10 rounded border flex items-center justify-center text-xs font-bold transition-all uppercase ${round === 'ROUND_2' ? 'border-yellow-500 bg-yellow-950/30 text-yellow-300 animate-pulse' : (round === 'ROUND_3' || round === 'ROUND_4' || round === 'FINAL') ? 'border-green-500 bg-green-950/30 text-green-300' : 'border-purple-500/20 bg-slate-900/40 text-slate-500'}`}>
                  { (round === 'ROUND_3' || round === 'ROUND_4' || round === 'FINAL') ? 'REQUEST ✓' : 'REQUEST' }
                </div>
                <div className="h-4 w-[1px] border-r border-dashed border-purple-500/40"></div>
              </div>

              {/* NODE: SERVER */}
              <div className="flex flex-col items-center">
                <div className={`w-20 h-10 rounded border flex flex-col items-center justify-center text-xs font-bold transition-all ${round === 'ROUND_3' || round === 'ROUND_4' || round === 'FINAL' ? 'border-purple-500 bg-purple-950/30 text-white text-glow-purple' : 'border-purple-500/20 bg-slate-900/40 text-slate-500'}`}>
                  <Server className="w-3.5 h-3.5 mb-0.5" />
                  SERVER
                </div>
                <div className="h-4 w-[1px] border-r border-dashed border-purple-500/40"></div>
              </div>

              {/* NODE: RESPONSE */}
              <div className="flex flex-col items-center">
                <div className={`w-20 h-10 rounded border flex items-center justify-center text-xs font-bold transition-all uppercase ${round === 'ROUND_4' ? 'border-yellow-500 bg-yellow-950/30 text-yellow-300 animate-pulse' : round === 'FINAL' ? 'border-green-500 bg-green-950/30 text-green-300' : 'border-purple-500/20 bg-slate-900/40 text-slate-500'}`}>
                  { round === 'FINAL' ? 'RESPONSE ✓' : 'RESPONSE' }
                </div>
                <div className="h-4 w-[1px] border-r border-dashed border-purple-500/40"></div>
              </div>

              {/* NODE: WEBSITE LOADED */}
              <div className="flex flex-col items-center">
                <div className={`w-24 h-10 rounded border flex items-center justify-center text-xs font-bold text-center transition-all ${round === 'FINAL' ? 'border-green-500 bg-green-950/40 text-green-300 text-glow-green' : 'border-purple-500/20 bg-slate-900/40 text-slate-500'}`}>
                  WEBSITE LOADED
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center border-t border-[#23123a] pt-3">
            Clearing network protocols...
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN ASSESSMENT CONTENT */}
        <div className="lg:col-span-3 bg-[#0a0514]/90 border border-[#23123a] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {/* ==========================================
                STAGE: INTRO CARD
               ========================================== */}
            {round === 'INTRO' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 font-bold border-b border-[#23123a] pb-2">
                    <HelpCircle className="w-5 h-5 text-purple-400 animate-pulse" />
                    <span>SYSTEM DIAGNOSTICS DETECTED</span>
                  </div>
                  
                  <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 text-glow-purple uppercase">
                    FIELD ASSESSMENT 06
                  </h1>
                  <h2 className="font-mono text-purple-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
                    Mission: Network Operator
                  </h2>

                  <div className="bg-[#05010e] border border-[#23123a] p-4 rounded text-slate-300 text-sm leading-relaxed space-y-3 font-sans">
                    <p>
                      The core Sentinel communication network is down. A user is attempting to query the encrypted database portal node, but packets are stuck.
                    </p>
                    <p>
                      <strong>Your Mission:</strong> Step in as the virtual network operator. Route requests, manage server triggers, and assemble the source files to successfully build and deliver the portal to the user's terminal.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-widest text-sm rounded shadow-[0_0_15px_var(--color-neon-purple-glow)] hover:shadow-[0_0_20px_var(--color-neon-purple-glow)] cursor-pointer transition-all border border-purple-500"
                >
                  INITIALIZE NETWORK REPAIR
                </button>
              </motion.div>
            )}

            {/* ==========================================
                STAGE: ROUND 1
               ========================================== */}
            {round === 'ROUND_1' && (
              <motion.div
                key="round1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest block uppercase">
                    Stage 1 // Handshake Initiation
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">
                    A user wants to visit the Sentinel website. What should happen first?
                  </h2>

                  <div className="grid grid-cols-1 gap-3 font-mono mt-4">
                    <button
                      onClick={() => handleRound1Select('request')}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded border text-left text-sm transition-all cursor-pointer ${
                        selectedOption === 'request'
                          ? isCorrect
                            ? 'border-green-500 bg-green-950/20 text-green-300 font-bold'
                            : 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                          : 'border-[#23123a] bg-[#0d061a] hover:border-purple-400 text-slate-200'
                      }`}
                    >
                      A. Browser sends a request
                    </button>
                    <button
                      onClick={() => handleRound1Select('response')}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded border text-left text-sm transition-all cursor-pointer ${
                        selectedOption === 'response'
                          ? isCorrect
                            ? 'border-green-500 bg-green-950/20 text-green-300 font-bold'
                            : 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                          : 'border-[#23123a] bg-[#0d061a] hover:border-purple-400 text-slate-200'
                      }`}
                    >
                      B. Server sends a response
                    </button>
                  </div>

                  <AnimatePresence>
                    {isAnswered && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`mt-4 p-4 rounded border font-sans text-xs ${
                          isCorrect ? 'border-green-500/40 bg-green-950/10' : 'border-red-500/40 bg-red-950/10'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                              <div className="space-y-1 font-mono">
                                <span className="font-bold text-green-400 uppercase block">Correct selection.</span>
                                <p className="text-slate-300 text-xs">
                                  Browsers request websites from servers. A client-side query must always kick off the process.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                              <div className="space-y-1 font-mono">
                                <span className="font-bold text-red-400 uppercase block">Terminal Fault.</span>
                                <p className="text-slate-300 text-xs">
                                  Incorrect. The server cannot formulate a response packet without a request initiating the handshake first. Try again.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  {!isCorrect && isAnswered && (
                    <button
                      onClick={() => {
                        setSelectedOption(null);
                        setIsAnswered(false);
                        setIsCorrect(null);
                      }}
                      className="px-5 py-2.5 bg-slate-900 border border-[#23123a] text-slate-300 hover:border-purple-400 rounded text-xs tracking-wider cursor-pointer"
                    >
                      RETRY ASSIGNMENT
                    </button>
                  )}
                  {isCorrect && (
                    <button
                      onClick={handleNextRound}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-purple-500/20"
                    >
                      NEXT ROUND
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ==========================================
                STAGE: ROUND 2
               ========================================== */}
            {round === 'ROUND_2' && (
              <motion.div
                key="round2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest block uppercase">
                    Stage 2 // Dispatch Request
                  </span>
                  <h2 className="text-md font-bold text-slate-100">
                    A user wants to establish a handshake connection. Drag the REQUEST package from the Browser to the Server node.
                  </h2>

                  <div className="border border-[#23123a] bg-slate-950/60 p-4 rounded flex items-center justify-between min-h-[140px] relative overflow-hidden select-none mt-2">
                    
                    {/* Line path background */}
                    <div className="absolute top-1/2 left-[70px] right-[70px] -translate-y-1/2 h-[2px] bg-dashed border-t-2 border-[#23123a]"></div>

                    {/* Node A: Browser */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-full border border-purple-500 flex items-center justify-center bg-purple-950/30 text-purple-300 shadow-[0_0_10px_rgba(162,88,255,0.2)]">
                        <Laptop className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">BROWSER</span>
                    </div>

                    {/* DRAGGABLE OBJECT (REQUEST) */}
                    <div className="flex-1 flex justify-center items-center relative h-full">
                      {!requestDelivered ? (
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: 0, right: 180 }}
                          onDragStart={() => setIsDraggingPackage(true)}
                          onDragEnd={handleRequestDragEnd}
                          className="bg-yellow-500 text-slate-950 font-bold text-xs p-3 rounded-md cursor-grab active:cursor-grabbing shadow-[0_0_12px_rgba(234,179,8,0.5)] z-20 border border-yellow-300 select-none"
                          style={{ x: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                        >
                          REQUEST ✉
                        </motion.div>
                      ) : (
                        <div className="text-green-400 text-xs font-bold uppercase tracking-wider animate-pulse select-none">
                          Delivered ✓
                        </div>
                      )}
                    </div>

                    {/* Node B: Server */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300 ${requestDelivered ? 'border-green-500 bg-green-950/30 text-green-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-[#23123a] bg-slate-900/50 text-slate-500'}`}>
                        <Server className="w-6 h-6" />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">SERVER</span>
                    </div>

                  </div>

                  <AnimatePresence>
                    {isDraggingPackage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-yellow-500/70 text-center tracking-widest mt-1 uppercase"
                      >
                        ⚠️ Drag rightwards towards the Server terminal
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  {requestDelivered && (
                    <div className="p-3.5 bg-green-950/10 border border-green-500/30 rounded font-sans text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div className="font-mono text-xs">
                        <span className="font-bold text-green-400 uppercase block">Handshake Delivered.</span>
                        <p className="text-slate-300 mt-1">
                          This communication is called a **request**. The server has accepted the TCP packet.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    {requestDelivered ? (
                      <button
                        onClick={handleNextRound}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-purple-500/20"
                      >
                        PROCEED
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-6 py-2.5 bg-slate-800 text-slate-500 rounded text-xs font-bold tracking-widest uppercase cursor-not-allowed select-none opacity-50"
                      >
                        DRAG TO DELIVER
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==========================================
                STAGE: ROUND 3
               ========================================== */}
            {round === 'ROUND_3' && (
              <motion.div
                key="round3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest block uppercase">
                    Stage 3 // Server Decryption
                  </span>
                  <h2 className="text-md font-bold text-slate-100">
                    The request package has arrived. What should the server do?
                  </h2>

                  <div className="grid grid-cols-1 gap-2.5 font-mono mt-3">
                    <button
                      onClick={() => handleRound3Select('ignore')}
                      disabled={isAnswered}
                      className={`w-full p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                        selectedOption === 'ignore'
                          ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                          : 'border-[#23123a] bg-[#0d061a] hover:border-purple-400 text-slate-300'
                      }`}
                    >
                      A. Ignore it
                    </button>
                    <button
                      onClick={() => handleRound3Select('send')}
                      disabled={isAnswered}
                      className={`w-full p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                        selectedOption === 'send'
                          ? 'border-green-500 bg-green-950/20 text-green-300 font-bold'
                          : 'border-[#23123a] bg-[#0d061a] hover:border-purple-400 text-slate-300'
                      }`}
                    >
                      B. Send the website
                    </button>
                    <button
                      onClick={() => handleRound3Select('another')}
                      disabled={isAnswered}
                      className={`w-full p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                        selectedOption === 'another'
                          ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                          : 'border-[#23123a] bg-[#0d061a] hover:border-purple-400 text-slate-300'
                      }`}
                    >
                      C. Request another browser
                    </button>
                  </div>

                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-[#05010e] border border-[#23123a] rounded p-4 text-xs font-mono space-y-2 mt-3 select-none"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-bold uppercase animate-pulse">
                            Server is preparing website files...
                          </span>
                          <span className="text-slate-400">{processingProgress}%</span>
                        </div>
                        <div className="w-full bg-[#0d061a] border border-[#23123a] rounded h-2 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          ></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isAnswered && !isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-3.5 bg-red-950/10 border border-red-500/30 rounded font-sans text-xs"
                      >
                        <span className="font-bold text-red-400 uppercase block font-mono">Incorrect response.</span>
                        <p className="text-slate-300 mt-1">
                          Ignoring the request breaks user connectivity, and request routing to another browser is invalid. The server must handle queries.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  {processingProgress >= 100 && (
                    <div className="p-3.5 bg-green-950/10 border border-green-500/30 rounded font-sans text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div className="font-mono text-xs">
                        <span className="font-bold text-green-400 uppercase block">Operation Complete.</span>
                        <p className="text-slate-300 mt-1">
                          Servers store and deliver websites. The dataset compilation has successfully processed.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    {!isCorrect && isAnswered && (
                      <button
                        onClick={() => {
                          setSelectedOption(null);
                          setIsAnswered(false);
                          setIsCorrect(null);
                        }}
                        className="px-5 py-2.5 bg-slate-900 border border-[#23123a] text-slate-300 hover:border-purple-400 rounded text-xs tracking-wider cursor-pointer"
                      >
                        RETRY OBJECTIVE
                      </button>
                    )}
                    {processingProgress >= 100 && (
                      <button
                        onClick={handleNextRound}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-purple-500/20"
                      >
                        PROCEED
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==========================================
                STAGE: ROUND 4
               ========================================== */}
            {round === 'ROUND_4' && (
              <motion.div
                key="round4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest block uppercase animate-pulse">
                    Stage 4 // File Reassembly
                  </span>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-100">
                    The server is delivering style, homepage, and image files. Drag all 3 cards from the Server (right) into the Browser dropzone (left).
                  </h2>

                  {/* Visual Drop Area / Pipeline */}
                  <div className="border border-[#23123a] bg-slate-950/60 p-4 rounded min-h-[220px] flex justify-between items-stretch gap-6 relative overflow-hidden select-none">
                    
                    {/* BROWSER DROP ZONE */}
                    <div className="w-[160px] border-2 border-dashed border-purple-500/30 bg-purple-950/5 rounded-lg p-3 flex flex-col justify-between items-center text-center relative z-10 transition-all duration-300">
                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        Browser Area
                      </div>
                      
                      <Laptop className="w-10 h-10 text-purple-400 opacity-60 animate-pulse my-2" />

                      <div className="w-full bg-[#05010e] border border-[#23123a] rounded h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold mt-1">
                        Files Loaded: {deliveredCount}/3 ({progressPercent}%)
                      </span>
                    </div>

                    {/* MIDDLE TRANSFER LINE */}
                    <div className="flex-1 flex flex-col justify-center items-center gap-1.5 relative border-l border-r border-[#23123a]/30">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest font-mono select-none">
                        ← Drag Left to Deliver
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 rotate-180 animate-pulse" />
                    </div>

                    {/* SERVER CARD ZONE */}
                    <div className="w-[180px] bg-slate-900/40 border border-[#23123a] rounded-lg p-2.5 flex flex-col gap-2.5 items-stretch relative z-10">
                      <div className="text-[9px] text-slate-400 uppercase font-bold text-center border-b border-[#23123a] pb-1.5 mb-1 flex items-center justify-center gap-1">
                        <Server className="w-3 h-3 text-purple-400" />
                        Server Outbox
                      </div>

                      {files.map((file) => (
                        <div key={file.id} className="relative h-10">
                          {!file.delivered ? (
                            <motion.div
                              drag="x"
                              dragConstraints={{ left: -220, right: 0 }}
                              onDragEnd={(_e, info) => handleFileDragEnd(file.id, info)}
                              className={`border p-2 rounded text-[11px] font-bold font-mono cursor-grab active:cursor-grabbing shadow-sm flex items-center gap-1.5 w-full select-none absolute z-20 ${file.color}`}
                              whileHover={{ scale: 1.03 }}
                              whileDrag={{ scale: 1.05, zIndex: 50 }}
                            >
                              {file.type === 'homepage' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                              {file.type === 'images' && <Image className="w-3.5 h-3.5 text-green-400" />}
                              {file.type === 'styles' && <Palette className="w-3.5 h-3.5 text-yellow-400" />}
                              <span>{file.name}</span>
                            </motion.div>
                          ) : (
                            <div className="border border-green-500/20 bg-green-950/10 text-green-400 text-[10px] p-2 rounded flex items-center justify-between w-full font-bold select-none absolute">
                              <span className="line-through">{file.name}</span>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-slate-400 font-mono text-[10px] space-y-1">
                    {files.map(f => (
                      <div key={f.id} className="flex justify-between items-center">
                        <span>• {f.name}:</span>
                        <span className={f.delivered ? "text-green-400 font-bold" : "text-yellow-500 animate-pulse"}>
                          {f.delivered ? "RECEIVED" : "WAITING FOR OPERATOR"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    {progressPercent >= 100 ? (
                      <button
                        onClick={handleNextRound}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-purple-500/20 animate-bounce-subtle"
                      >
                        ASSEMBLE WEBSITE
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-6 py-2.5 bg-slate-800 text-slate-500 rounded text-xs font-bold tracking-widest uppercase cursor-not-allowed select-none opacity-50"
                      >
                        REASSEMBLE ({deliveredCount}/3)
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==========================================
                STAGE: FINAL SCENE & SUMMARY
               ========================================== */}
            {round === 'FINAL' && (
              <motion.div
                key="final"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="text-center border-b border-purple-950 pb-2 flex flex-col items-center">
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                      SYSTEM ONLINE // LINK SUCCESSFUL
                    </span>
                    <h2 className="text-slate-100 text-xl font-extrabold uppercase mt-0.5 text-glow-green">
                      SENTINEL PORTAL SECURED
                    </h2>
                  </div>

                  {/* Simulated Portal Content */}
                  <div className="border border-green-500 bg-[#0d061a] rounded p-4 text-center max-w-sm mx-auto shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <div className="text-2xl mb-1">🛡️</div>
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest font-mono">
                      SENTINEL SECURITY PORTAL
                    </span>
                    <div className="text-slate-100 text-sm font-extrabold mt-2 font-mono uppercase">
                      Welcome Agent
                    </div>
                    <div className="text-slate-400 text-xs mt-1.5 font-sans">
                      All assets loaded. Connection successfully established.
                    </div>
                    <div className="mt-4 px-3 py-1.5 rounded bg-green-950/20 border border-green-500/20 text-[11px] text-green-400 font-mono inline-block">
                      Clearance: ACTIVE
                    </div>
                  </div>

                  {/* Summary Lessons */}
                  <div className="bg-[#05010e] border border-[#23123a] p-4 rounded text-xs text-slate-300 font-mono space-y-2 select-all">
                    <span className="text-[10px] text-purple-400 font-bold uppercase block tracking-wider mb-1.5">
                      Internet Summary // Core Protocols
                    </span>
                    <div className="space-y-1.5 leading-relaxed font-sans text-xs">
                      <div>1. <strong>User</strong> opens a browser interface.</div>
                      <div>2. <strong>Browser</strong> issues a request query to the endpoint.</div>
                      <div>3. <strong>Server</strong> receives and decodes the request handshake.</div>
                      <div>4. <strong>Server</strong> returns a structured response package.</div>
                      <div>5. <strong>Browser</strong> compiles and renders the styles, markup, and assets.</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      resetRoundStates();
                      setRound('INTRO');
                    }}
                    className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold text-xs py-3 rounded border border-[#23123a] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    RETRY TRAINING
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      alert('TRAINING COMPLETE: Sentinel core network stack clears are catalogued.');
                    }}
                    className="flex-1 bg-purple-950 hover:bg-purple-900 text-purple-400 font-bold text-xs py-3 rounded border-2 border-purple-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-purple-500/10 animate-pulse"
                  >
                    FINALIZE TRAINING
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      <footer className="relative z-10 py-1.5 border-t border-[#23123a] text-center font-mono text-[9px] text-slate-600 mt-4 select-none">
        PROJECT SENTINEL ASSESSMENT SUITE 2.0 // RESTRICTED ACCESS
      </footer>
    </div>
  );
}
