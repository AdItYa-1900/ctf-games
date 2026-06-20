import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw, ChevronRight, Clock, AlertTriangle, CheckCircle2, Terminal } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. DATASETS & SIMPLIFIED SITUATIONS
// ==========================================
interface Situation {
  id: number;
  prompt: string;
  correctCommand: string;
  options: string[]; // Options list
  output: string[];  // Terminal console output lines
  promptPath: string;
}

const situations: Situation[] = [
  {
    id: 1,
    prompt: "Clue 1 is hidden in the first 10 lines of the agent dataset file. Execute the header slice command to read them.",
    correctCommand: "head agents.txt",
    options: ["head agents.txt", "tail agents.txt", "cat agents.txt", "less agents.txt"],
    output: [
      "# ====================================================",
      "# ACTIVE SENTINEL FIELD AGENTS DATASET",
      "# SECURITY CLUE 1: INFILTRATOR CODENAME IS A BIRD.",
      "# ====================================================",
      "Agent ID: 001 | NAME: Agent Alpha    | STATUS: ACTIVE",
      "Agent ID: 002 | NAME: Agent Bravo    | STATUS: ACTIVE"
    ],
    promptPath: "~"
  },
  {
    id: 2,
    prompt: "Clue 2 is hidden in the last 10 lines of the agent dataset file. Execute the footer slice command to read them.",
    correctCommand: "tail agents.txt",
    options: ["tail agents.txt", "head agents.txt", "cat agents.txt", "less agents.txt"],
    output: [
      "Agent ID: 190 | NAME: Agent Omega    | STATUS: SUSPENDED",
      "# ====================================================",
      "# WARNING: DATA INTEGRITY SECURITY LEAK DETECTED",
      "# SUSPECT CODENAME KEY SIGNATURE PREFIX IS 'RVN_'.",
      "# ====================================================",
      "Agent ID: 200 | STATUS: STABLE       | NODE: ACTIVE"
    ],
    promptPath: "~"
  },
  {
    id: 3,
    prompt: "A small configuration file profile_raven.txt has been found. Read its content using the quick output command to inspect the profile.",
    correctCommand: "cat profile_raven.txt",
    options: ["cat profile_raven.txt", "less profile_raven.txt", "head profile_raven.txt", "tail profile_raven.txt"],
    output: [
      "================ SUSPECT PROFILE DETAILS ================",
      "CODENAME: Agent Raven",
      "REAL NAME: Julian Vance",
      "ROLE: Firewall Administrator",
      "SIG: RVN_9921_SIG",
      "ACCESS KEY: confession.log (DECRYPT KEY: KEY-6602)",
      "========================================================="
    ],
    promptPath: "~"
  },
  {
    id: 4,
    prompt: "A large log file confession.log is on disk. Open it using the scrollable pager tool to check the confession statement.",
    correctCommand: "less confession.log",
    options: ["less confession.log", "cat confession.log", "head confession.log", "tail confession.log"],
    output: [
      "Launching pager: less confession.log",
      "[Lines 80-84 of 120]",
      "# ====================================================",
      "# OBSIDIAN INFILTRATOR CONFESSION LOG",
      "# I, Agent Raven, bypassed the firewalls to transmit",
      "# Sentinel database key signatures. Access: KEY-6602.",
      "# ===================================================="
    ],
    promptPath: "~"
  },
  {
    id: 5,
    prompt: "Analyze the collected clues. Identify the compromised infiltrator codename from the register.",
    correctCommand: "Agent Raven",
    options: ["Agent Falcon", "Agent Hawk", "Agent Raven", "Agent Eagle"],
    output: [
      "INFILTRATOR CODENAME LOCKED: Agent Raven",
      "STATUS: DETECTED & ISOLATED",
      "Decryption Access Code: KEY-6602 Overridden."
    ],
    promptPath: "~"
  }
];

// ==========================================
// 2. SYNTHESIZED SOUND SYSTEM (Web Audio API)
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
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      console.warn(e);
    }
  }

  public playKeystroke() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
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
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.setValueAtTime(90, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn(e);
    }
  }

  public playObjectiveComplete() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.18);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

const sound = new SoundManager();

const TelemetryOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg">
      <div className="absolute inset-0 cyber-grid opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500/5 shadow-[0_0_6px_rgba(59,130,246,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-blue-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-blue-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-blue-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-blue-500/20"></div>
    </div>
  );
};

interface IntroScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, isMuted, onToggleMute }) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDecrypting) return;
    sound.playClick();
    setIsDecrypting(true);

    const interval = setInterval(() => {
      setDecryptProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onStart();
          }, 300);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20 + 8);
      });
    }, 80);
  };

  return (
    <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-blue-500 rounded-lg p-6 shadow-[0_0_20px_rgba(59,130,246,0.35)] text-center relative overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
        <div className="flex items-center gap-1.5 text-blue-400 text-sm font-mono tracking-widest font-bold">
          <Terminal className="w-4 h-4" />
          PROJECT SENTINEL
        </div>
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-blue-400 cursor-pointer animate-none"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
        </button>
      </div>

      <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">
        FIELD ASSESSMENT 04
      </h1>
      <h2 className="font-mono text-blue-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
        Mission: Find the Fake Agent
      </h2>

      <AnimatePresence mode="wait">
        {!isDecrypting ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-6"
          >
            <div className="bg-slate-950/60 border border-cyber-border/40 rounded p-5 text-sm sm:text-base text-slate-200 font-mono text-left space-y-4 leading-relaxed max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              <p className="text-slate-300 font-sans text-sm sm:text-[14px]">
                Agent, an Obsidian infiltrator has compromised the database register. A dataset containing 200 agents (`agents.txt`) is located on this secure node.
              </p>

              <div className="border-l-2 border-blue-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-blue-300 uppercase tracking-wider font-bold font-mono">MISSION PARAMETERS:</p>
                <div className="text-slate-400 text-xs sm:text-[13px] font-sans mt-1 space-y-1">
                  <div>• Inspect sections of the dataset using UNIX slice commands (`head`, `tail`).</div>
                  <div>• Examine small logs and inspect scrollable configuration profiles (`cat`, `less`).</div>
                  <div>• Gather clues from the output buffers to isolate and identify the infiltrator.</div>
                </div>
              </div>

              <div className="text-slate-400 text-[11px] border-l-2 border-blue-500 pl-3">
                Link Duration limit: <strong>90 Seconds</strong> | Stability tolerance: <strong>3 Faults</strong>
              </div>
            </div>

            <div className="space-y-3 font-mono">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest">
                Click Start Mission to begin your terminal assessment.
              </p>
              <form onSubmit={handleStart}>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-blue-500 shadow-md cursor-pointer transition-all uppercase animate-pulse"
                >
                  START MISSION
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 mb-4 space-y-4"
          >
            <div className="font-mono text-xs sm:text-sm text-blue-400 flex flex-col items-center gap-2">
              <span className="animate-pulse font-bold tracking-wider">
                DECRYPTING SIMULATOR MODULES...
              </span>
            </div>
            <div className="w-full bg-slate-950 border border-cyber-border rounded h-4 overflow-hidden p-[1px]">
              <div
                className="h-full bg-blue-600/80 rounded transition-all duration-700"
                style={{ width: `${decryptProgress}%` }}
              ></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. MAIN TERMINAL COMPONENT
// ==========================================
interface TerminalLogLine {
  text: string;
  type: 'input' | 'output' | 'error';
}

const Modul4Game: React.FC = () => {
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'GAMEOVER' | 'WON'>('INTRO');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  // Stats
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [currentSituationIndex, setCurrentSituationIndex] = useState(0);

  // Terminal log
  const [terminalHistory, setTerminalHistory] = useState<TerminalLogLine[]>([
    { text: "Connection Handshake secure...", type: 'output' },
    { text: "INFILTRATOR REGISTER DETECTED: agents.txt (200 records)", type: 'output' },
    { text: "Execute commands to locate clues and lock codename.", type: 'output' }
  ]);

  // Options list state
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  // Typing state
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);

  const timeLeftRef = useRef(90);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const activeSituation = situations[currentSituationIndex];

  // Helper: Shuffle options
  const shuffleOptions = (optionsList: string[]) => {
    const list = [...optionsList];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  // Start/Restart
  const handleStartMission = () => {
    sound.playClick();
    setLives(3);
    setTimeLeft(90);
    timeLeftRef.current = 90;
    setCurrentSituationIndex(0);
    setTerminalHistory([
      { text: "Connection Handshake secure...", type: 'output' },
      { text: "INFILTRATOR REGISTER DETECTED: agents.txt (200 records)", type: 'output' },
      { text: "Execute commands to locate clues and lock codename.", type: 'output' }
    ]);
    setShuffledOptions(shuffleOptions(situations[0].options));
    setTypingText("");
    setIsTyping(false);
    setErrorFlash(false);
    setGameState('PLAYING');
  };

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(interval);
        sound.playIncorrect();
        setGameState('GAMEOVER');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Scroll to bottom
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, typingText, isTyping]);

  // Execute command
  const executeCommand = (command: string) => {
    const isCorrect = command === activeSituation.correctCommand;
    const isSuspectSelection = activeSituation.id === 5;
    const promptPrefix = isSuspectSelection ? "system@sentinel:#" : "agent@sentinel:~$";

    if (isCorrect) {
      // Append input command
      const updatedHistory = [
        ...terminalHistory,
        { text: `${promptPrefix} ${command}`, type: 'input' as const }
      ];

      // Append command output line-by-line
      activeSituation.output.forEach((line) => {
        updatedHistory.push({ text: line, type: 'output' as const });
      });

      setTerminalHistory(updatedHistory);

      // Progress to next situation
      const nextIndex = currentSituationIndex + 1;
      if (nextIndex >= situations.length) {
        sound.playObjectiveComplete();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#06b6d4']
        });
        setTimeout(() => setGameState('WON'), 1200);
      } else {
        sound.playClick();
        setCurrentSituationIndex(nextIndex);
        setShuffledOptions(shuffleOptions(situations[nextIndex].options));
      }
    } else {
      // Wrong command error output
      sound.playIncorrect();
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 500);

      const errorMsg = isSuspectSelection
        ? `SYSTEM ERROR: Selected suspect codename ${command} is incorrect!`
        : `sh: command not found or invalid parameter: '${command}'`;

      setTerminalHistory([
        ...terminalHistory,
        { text: `${promptPrefix} ${command}`, type: 'input' },
        { text: errorMsg, type: 'error' },
        { text: `Firewall locks closing. Integrity leak triggered.`, type: 'error' }
      ]);

      setLives((prev) => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setTimeout(() => setGameState('GAMEOVER'), 800);
        }
        return nextLives;
      });
    }
  };

  // Typewriter anim selection
  const handleSelectOption = (option: string) => {
    if (isTyping || gameState !== 'PLAYING') return;

    setIsTyping(true);
    let currentText = "";
    let idx = 0;

    const interval = setInterval(() => {
      currentText += option[idx];
      setTypingText(currentText);
      sound.playKeystroke();
      idx++;
      if (idx >= option.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTyping(false);
          setTypingText("");
          executeCommand(option);
        }, 150);
      }
    }, 60);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between crt-overlay">
      <TelemetryOverlay />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md text-center select-none pt-2 pb-4 font-mono">
          <div className="text-[11px] text-blue-400/50 font-bold tracking-[0.25em] uppercase">
            PROJECT SENTINEL
          </div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1">
            FIELD ASSESSMENT 04
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ==========================================
              A. INTRO SCREEN
             ========================================== */}
          {gameState === 'INTRO' && (
            <IntroScreen onStart={handleStartMission} isMuted={isMuted} onToggleMute={handleToggleMute} />
          )}

          {/* ==========================================
              B. ACTIVE PLAYING CANVAS
             ========================================== */}
          {gameState === 'PLAYING' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full max-w-xl bg-black border-2 rounded-md p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md transition-all duration-100 relative min-h-[500px] ${errorFlash ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'}`}
            >
              {/* HUD Info Header */}
              <div className="w-full bg-cyber-card/90 border border-cyber-border rounded-lg p-4 flex justify-between items-center font-mono text-xs shadow-md select-none my-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">NODE INVESTIGATE</span>
                  <span className="text-blue-400 font-bold text-sm sm:text-base text-glow-blue">STAGE {currentSituationIndex + 1}/5</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TIME LEFT</span>
                  <span className={`font-bold text-sm sm:text-base flex items-center gap-1.5 ${timeLeft <= 15 ? 'text-red-400 animate-pulse font-extrabold text-glow-red' : 'text-blue-400 text-glow-blue'}`}>
                    <Clock className="w-4 h-4" />
                    {timeLeft}s
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Signal Indicator for lives */}
                  <div className="flex items-end gap-1 h-5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">STABILITY:</span>
                    <div className={`w-1.5 h-2.5 rounded-sm transition-colors ${lives >= 1 ? 'bg-blue-400 shadow-[0_0_4px_#3b82f6]' : 'bg-slate-800'}`}></div>
                    <div className={`w-1.5 h-3.5 rounded-sm transition-colors ${lives >= 2 ? 'bg-blue-400 shadow-[0_0_4px_#3b82f6]' : 'bg-slate-800'}`}></div>
                    <div className={`w-1.5 h-4.5 rounded-sm transition-colors ${lives >= 3 ? 'bg-blue-400 shadow-[0_0_4px_#3b82f6]' : 'bg-slate-800'}`}></div>
                  </div>
                  <button onClick={handleToggleMute} className="p-1.5 rounded text-slate-400 hover:text-blue-400 cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
                  </button>
                </div>
              </div>

              {/* FAKE TERMINAL SCREEN */}
              <div className="w-full flex-1 bg-slate-950/90 rounded border border-blue-900/50 p-3 my-3 min-h-[220px] max-h-[260px] overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col scrollbar-thin">
                {terminalHistory.map((line, idx) => {
                  const promptPrefix = activeSituation.id === 5 ? "system@sentinel:#" : "agent@sentinel:~$";
                  
                  if (line.type === 'input') {
                    return (
                      <div key={idx} className="text-blue-400 font-semibold select-none">
                        {`${promptPrefix} ${line.text.replace(promptPrefix, "").trim()}`}
                      </div>
                    );
                  } else if (line.type === 'error') {
                    return (
                      <div key={idx} className="text-red-500 font-bold select-none">
                        {line.text}
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} className="text-slate-300 whitespace-pre select-all">
                        {line.text}
                      </div>
                    );
                  }
                })}

                {/* Dynamic typing cursor */}
                {isTyping && (
                  <div className="text-blue-400 font-bold">
                    {activeSituation.id === 5 ? "system@sentinel:# " : "agent@sentinel:~$ "}
                    <span>{typingText}</span>
                    <span className="w-1.5 h-3 bg-blue-400 inline-block animate-pulse ml-0.5"></span>
                  </div>
                )}

                {/* Inactive trailing prompt */}
                {!isTyping && (
                  <div className="text-blue-500/60">
                    {activeSituation.id === 5 ? "system@sentinel:# " : "agent@sentinel:~$ "}
                    <span className="w-1.5 h-3 bg-blue-500/60 inline-block animate-pulse ml-0.5"></span>
                  </div>
                )}

                <div ref={terminalBottomRef}></div>
              </div>

              {/* SITUATION BRIEF PROMPT */}
              <div className="w-full border border-blue-900 bg-blue-950/15 rounded p-3 text-[12px] text-slate-200 leading-relaxed my-1 select-none">
                <span className="text-[9px] text-blue-400 font-bold block uppercase tracking-widest mb-0.5">SITUATION REQUIREMENT:</span>
                <p>{activeSituation.prompt}</p>
              </div>

              {/* OPTION SELECTIONS */}
              <div className="grid grid-cols-2 gap-3 mt-3 select-none">
                {shuffledOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option)}
                    disabled={isTyping}
                    className="border-2 border-blue-900 hover:border-blue-400 bg-slate-950 text-blue-400 hover:text-blue-300 font-mono font-bold text-xs py-3 px-2 rounded-md transition-all cursor-pointer text-center relative overflow-hidden group shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent group-hover:via-blue-400"></div>
                    {activeSituation.id === 5 ? option : `$ ${option}`}
                  </button>
                ))}
              </div>

              {/* Footer panel */}
              <div className="w-full flex justify-between items-center text-[9px] text-slate-500 font-mono mt-3 select-none">
                <span>SELECT THE LOGICAL UNIX SHELL OPERATOR TO NAVIGATE DEEPER</span>
                <button
                  onClick={handleToggleMute}
                  className="p-1 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {isMuted ? "UNMUTE SYSTEM AUDIO" : "MUTE SYSTEM AUDIO"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              C. LOCKOUT GAME OVER SCREEN
             ========================================== */}
          {gameState === 'GAMEOVER' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black border-2 border-red-600 rounded-md p-6 shadow-[0_0_20px_rgba(220,38,38,0.4)] space-y-6 relative"
            >
              <div className="text-center border-b border-red-950 pb-3">
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">LINK TERMINATED</span>
                <h2 className="text-slate-200 text-xl font-extrabold uppercase mt-0.5 animate-pulse text-glow-red">
                  TERMINAL LOCKOUT
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-red-950/20 border border-red-900/30 rounded p-4 text-xs font-mono text-red-400">
                  <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
                  <div className="leading-relaxed">
                    Firewall security protocols detected invalid commands scan. Virtual connection has been closed.
                  </div>
                </div>

                <div className="bg-slate-950 border border-blue-950 rounded p-4 text-xs font-mono text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>INVESTIGATION NODE:</span>
                    <span className="text-red-500 font-bold">FAILED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ELAPSED LINK TIME:</span>
                    <span>{90 - timeLeft} seconds</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartMission}
                className="w-full bg-slate-950 hover:bg-red-950 text-red-400 font-bold text-xs py-3 px-6 rounded border border-red-600 hover:border-red-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(220,38,38,0.1)]"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                RE-ESTABLISH HANDSHAKE
              </button>
            </motion.div>
          )}

          {/* ==========================================
              D. MISSION SUCCESS DOSSIER SCREEN
             ========================================== */}
          {gameState === 'WON' && (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-black border-2 border-blue-500 rounded-md p-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] space-y-6 relative"
            >
              <div className="text-center border-b border-blue-950 pb-3">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">NODE SECURED</span>
                <h2 className="text-slate-100 text-xl font-extrabold uppercase mt-0.5 text-glow-blue">
                  INFILTRATOR DETECTED
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/30 rounded p-4 text-xs font-mono text-blue-400">
                  <CheckCircle2 className="w-8 h-8 text-blue-500 shrink-0" />
                  <div className="leading-relaxed">
                    Infiltrator correctly identified as <span className="underline text-slate-100 font-bold">Agent Raven</span>! Credentials access code successfully retrieved: <span className="text-white font-bold font-mono">KEY-6602</span>.
                  </div>
                </div>

                {/* Traversal console history logs */}
                <div className="flex flex-col gap-1 select-none">
                  <span className="text-[9px] text-blue-500/70 font-bold uppercase tracking-wider">TRAVERSED CONSOLE LOGS:</span>
                  <div className="bg-slate-950 border border-blue-950 rounded p-3 text-[10px] text-slate-400 max-h-[140px] overflow-y-auto scrollbar-thin space-y-1">
                    <div>$ head agents.txt</div>
                    <div>$ tail agents.txt</div>
                    <div>$ cat profile_raven.txt</div>
                    <div>$ less confession.log</div>
                    <div className="text-blue-400 font-bold"># Agent Raven</div>
                  </div>
                </div>

                {/* Mission Diagnostics Stats */}
                <div className="bg-slate-950 border border-blue-950 rounded p-4 text-xs font-mono text-slate-400 space-y-2 select-none">
                  <div className="flex justify-between">
                    <span>DIAGNOSTIC RATIO:</span>
                    <span className="text-blue-400 font-bold">100.00% (PASSED)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HANDSHAKE DURATION:</span>
                    <span className="text-slate-300">{90 - timeLeft} seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STABILITY FAULTS:</span>
                    <span className="text-blue-400 font-bold">{3 - lives}/3 errors</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2 select-none">
                <button
                  onClick={handleStartMission}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-200 font-bold text-xs py-3 px-3 rounded border border-blue-950 hover:border-blue-500/50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  REPEAT SESSION
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    alert('CLASSIFIED: Module 4 checkpoints cleared. Secure evaluation complete.');
                  }}
                  className="flex-1 bg-blue-950 hover:bg-blue-900 text-blue-400 font-bold text-xs py-3 px-3 rounded border-2 border-blue-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-950/30 hover:shadow-blue-500/20 transition-all animate-pulse"
                >
                  PROCEED
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-2.5 border-t border-cyber-border/30 text-center font-mono text-[9px] text-slate-600 select-none bg-slate-950/20 backdrop-blur-sm">
        SECURE TRAINING CORE // FIND FAKE AGENT ACTIVE
      </footer>
    </div>
  );
};

export default Modul4Game;
