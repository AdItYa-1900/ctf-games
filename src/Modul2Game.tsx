import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw, Terminal, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. OBJECTIVES & DATASETS
// ==========================================
interface Objective {
  id: number;
  text: string;
  targetCommand: string;
  description: string;
}

const objectives: Objective[] = [
  {
    id: 1,
    text: "create a new directory",
    targetCommand: "mkdir <name>",
    description: "mkdir <name> - Create a new directory"
  },
  {
    id: 2,
    text: "view large files page by page",
    targetCommand: "less <file>",
    description: "less <file> - View large files page by page"
  },
  {
    id: 3,
    text: "delete a directory and its contents",
    targetCommand: "rm -r <directory>",
    description: "rm -r <directory> - Delete a directory and its contents"
  },
  {
    id: 4,
    text: "detailed listing including hidden files",
    targetCommand: "ls -la",
    description: "ls -la - Detailed listing including hidden files"
  }
];

interface CommandItem {
  command: string;
  description: string;
  isReal: boolean;
}

const commandsPool: CommandItem[] = [
  // Objective targets
  { command: 'mkdir <name>', description: 'Create a new directory', isReal: true },
  { command: 'less <file>', description: 'View large files page by page', isReal: true },
  { command: 'rm -r <directory>', description: 'Delete a directory and its contents', isReal: true },
  { command: 'ls -la', description: 'Detailed listing including hidden files', isReal: true },

  // Real helper commands
  { command: 'pwd', description: 'Print current working directory', isReal: true },
  { command: 'ls', description: 'List files and directories', isReal: true },
  { command: 'cd <directory>', description: 'Change directory', isReal: true },
  { command: 'cd ..', description: 'Move to parent directory', isReal: true },
  { command: 'cd ~', description: 'Move to home directory', isReal: true },
  { command: 'touch <file>', description: 'Create a new empty file', isReal: true },
  { command: 'cat <file>', description: 'Display file contents', isReal: true },
  { command: 'cp <source> <destination>', description: 'Copy files', isReal: true },
  { command: 'mv <old> <new>', description: 'Move or rename files', isReal: true },
  { command: 'rm <file>', description: 'Delete a file', isReal: true },
  { command: 'man <command>', description: 'Open manual pages', isReal: true },
  { command: '<command> --help', description: 'Display quick help and available options', isReal: true },
  { command: 'ls -l', description: 'Long/detailed listing', isReal: true },
  { command: 'ls -a', description: 'Show hidden files', isReal: true },
  { command: 'ls --all', description: 'Show all files (long-form version of -a)', isReal: true },

  // Fake / Typo commands
  { command: 'mkdiir <name>', description: 'Unknown command (typo of mkdir)', isReal: false },
  { command: 'toouch <file>', description: 'Unknown command (typo of touch)', isReal: false },
  { command: 'catt <file>', description: 'Unknown command (typo of cat)', isReal: false },
  { command: 'rmm <file>', description: 'Unknown command (typo of rm)', isReal: false },
  { command: 'lss -la', description: 'Unknown command (typo of ls)', isReal: false },
];

interface FallingBlock {
  id: string;
  command: string;
  description: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

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
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn(e);
    }
  }

  public playCorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(850, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.15);
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
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.22);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn(e);
    }
  }

  public playObjectiveComplete() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  public playVictory() {
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
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  public playGameOver() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.7);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.7);
    } catch (e) {
      console.warn(e);
    }
  }
}

const sound = new SoundManager();

// ==========================================
// 3. BACKGROUND EFFECTS
// ==========================================
const TelemetryOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg">
      <div className="absolute inset-0 cyber-grid opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500/5 shadow-[0_0_6px_rgba(16,185,129,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-emerald-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-emerald-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-emerald-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-emerald-500/20"></div>
    </div>
  );
};

// ==========================================
// 4. SCREEN MODULES
// ==========================================
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
    sound.playCorrect();
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
    <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-emerald-500 rounded-lg p-6 shadow-[0_0_20px_rgba(16,185,129,0.35)] text-center relative overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-mono tracking-widest font-bold">
          <Terminal className="w-4 h-4" />
          PROJECT SENTINEL
        </div>
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-emerald-400 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">
        FIELD ASSESSMENT 02
      </h1>
      <h2 className="font-mono text-emerald-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
        Mission: Command Catch
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
                Agent, malicious actors are dropping corrupted files and typographical shell scripts into the firewall buffer. To establish a secure terminal link, you must intercept the correct UNIX shell commands matching your current system objectives.
              </p>

              <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">CONTROLS INSTRUCTIONS:</p>
                <p className="text-slate-300 font-sans text-xs sm:text-[13px]">
                  Use the <span className="text-emerald-400 font-bold font-mono">A / D</span> keys or the <span className="text-emerald-400 font-bold font-mono">ARROW KEYS (← / →)</span> to steer your terminal bucket left and right.
                </p>
                <p className="text-slate-300 font-sans text-xs sm:text-[13px] mt-1">
                  Catch the falling commands that match the objective label shown on your bucket.
                </p>
              </div>

              <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">OBJECTIVES LIST:</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-400 text-xs sm:text-[13px] font-sans mt-1">
                  <li>Create a new directory (<span className="text-emerald-400 font-mono">mkdir &lt;name&gt;</span>)</li>
                  <li>View large files page by page (<span className="text-emerald-400 font-mono">less &lt;file&gt;</span>)</li>
                  <li>Delete a directory and its contents (<span className="text-emerald-400 font-mono">rm -r &lt;directory&gt;</span>)</li>
                  <li>Detailed listing including hidden files (<span className="text-emerald-400 font-mono">ls -la</span>)</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3 font-mono">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest">
                Click Start Mission to begin your terminal assessment.
              </p>
              <form onSubmit={handleStart}>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-emerald-500 shadow-md cursor-pointer transition-all uppercase animate-pulse"
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
            <div className="font-mono text-xs sm:text-sm text-emerald-400 flex flex-col items-center gap-2">
              <span className="animate-pulse font-bold tracking-wider">
                DECRYPTING SIMULATOR MODULES...
              </span>
            </div>
            <div className="w-full bg-slate-950 border border-cyber-border rounded h-4 overflow-hidden p-[1px]">
              <div
                className="h-full bg-emerald-600/80 rounded transition-all duration-700"
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
// 5. GAME ENGINE SCREEN
// ==========================================
interface GameScreenProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onFinished: (score: number, status: 'WON' | 'LOST') => void;
}

const BUCKET_SPEED = 2.0; // percentage step per frame (slightly increased for 40% wider game box)

const GameScreen: React.FC<GameScreenProps> = ({ isMuted, onToggleMute, onFinished }) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  const [bucketX, setBucketX] = useState(36); // 0 to 72 (since bucket is 28% wide)
  const [blocks, setBlocks] = useState<FallingBlock[]>([]);
  const [errorFlash, setErrorFlash] = useState(false);
  const [flashBanner, setFlashBanner] = useState<{
    visible: boolean;
    command: string;
    description: string;
  }>({ visible: false, command: '', description: '' });

  const [timeLeft, setTimeLeft] = useState(60);
  const timeLeftRef = useRef(60);

  // Refs to prevent stale closures in requestAnimationFrame loop
  const bucketXRef = useRef(36);
  const blocksRef = useRef<FallingBlock[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const objectiveCatchesRef = useRef(0);
  const currentObjectiveIndexRef = useRef(0);
  const speedRef = useRef(0.200); // falling step % per frame (reduced by another 20%)

  const keysPressed = useRef({ left: false, right: false });
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Game Countdown Timer (60 seconds limit)
  useEffect(() => {
    timeLeftRef.current = 60;
    setTimeLeft(60);

    const interval = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(interval);
        onFinished(scoreRef.current, 'LOST');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinished]);

  // Key Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressed.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressed.current.right = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressed.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressed.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Game Animation Loop
  useEffect(() => {
    let animId: number;
    let lastSpawnTime = Date.now();

    const loop = () => {
      // 1. Move Player Bucket
      let moved = false;
      if (keysPressed.current.left) {
        bucketXRef.current = Math.max(0, bucketXRef.current - BUCKET_SPEED);
        moved = true;
      }
      if (keysPressed.current.right) {
        bucketXRef.current = Math.min(72, bucketXRef.current + BUCKET_SPEED);
        moved = true;
      }
      if (moved) {
        setBucketX(bucketXRef.current);
      }

      // 2. Move & Collide Blocks
      const nextBlocks: FallingBlock[] = [];
      const currentSpeed = speedRef.current;
      const currentBucketX = bucketXRef.current;

      for (const block of blocksRef.current) {
        const nextY = block.y + currentSpeed;

        // Collision Check (bucket sits around y: 82 percent)
        const isAtBucketY = nextY >= 80 && nextY <= 84;
        if (isAtBucketY) {
          // Check horizontal overlap (bucket width is 28%)
          const isCaught = block.x >= currentBucketX - 4 && block.x <= currentBucketX + 30;
          if (isCaught) {
            handleCatch(block);
            continue; // Caught, don't include in nextBlocks list
          }
        }

        // Out of boundary check
        if (nextY >= 96) {
          continue; // Discard block quietly (no penalty for missing)
        }

        nextBlocks.push({ ...block, y: nextY });
      }

      blocksRef.current = nextBlocks;
      setBlocks(blocksRef.current);

      // 3. Spawning Check
      const now = Date.now();
      const spawnInterval = Math.max(900, 2300 - currentObjectiveIndexRef.current * 400);
      if (now - lastSpawnTime > spawnInterval) {
        spawnBlock();
        lastSpawnTime = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Block Spawner
  const spawnBlock = () => {
    const objective = objectives[currentObjectiveIndexRef.current];
    const targetCmd = objective.targetCommand;

    // Command Selection probability:
    // 35% chance to spawn target command, 40% other valid commands, 25% fake commands
    let selectedCmdItem: CommandItem;
    const roll = Math.random();

    if (roll < 0.35) {
      selectedCmdItem = commandsPool.find(c => c.command === targetCmd) || commandsPool[0];
    } else if (roll < 0.75) {
      const others = commandsPool.filter(c => c.command !== targetCmd && c.isReal);
      selectedCmdItem = others[Math.floor(Math.random() * others.length)];
    } else {
      const fakes = commandsPool.filter(c => !c.isReal);
      selectedCmdItem = fakes[Math.floor(Math.random() * fakes.length)];
    }

    const newBlock: FallingBlock = {
      id: Math.random().toString(),
      command: selectedCmdItem.command,
      description: selectedCmdItem.description,
      x: Math.random() * 74 + 3, // keep within bounds (3% to 77%)
      y: 0
    };

    blocksRef.current = [...blocksRef.current, newBlock];
    setBlocks(blocksRef.current);
  };

  // Catch Handler
  const handleCatch = (block: FallingBlock) => {
    const objective = objectives[currentObjectiveIndexRef.current];
    const isCorrect = block.command === objective.targetCommand;

    if (isCorrect) {
      sound.playCorrect();

      // Update score
      scoreRef.current += 100;
      setScore(scoreRef.current);

      // Flash correct banner
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      setFlashBanner({
        visible: true,
        command: block.command,
        description: block.description
      });
      bannerTimeoutRef.current = setTimeout(() => {
        setFlashBanner(prev => ({ ...prev, visible: false }));
      }, 3500);

      // Update objective progress
      objectiveCatchesRef.current += 1;

      if (objectiveCatchesRef.current >= 1) {
        sound.playObjectiveComplete();

        // Progress level or clear game
        if (currentObjectiveIndexRef.current >= objectives.length - 1) {
          setTimeout(() => onFinished(scoreRef.current, 'WON'), 200);
        } else {
          currentObjectiveIndexRef.current += 1;
          setCurrentObjectiveIndex(currentObjectiveIndexRef.current);
          objectiveCatchesRef.current = 0;

          // Speed scale increment (reduced by 20%)
          speedRef.current += 0.056;
        }
      }
    } else {
      sound.playIncorrect();

      // Lose a life
      livesRef.current -= 1;
      setLives(livesRef.current);

      // Damage visual flash
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 200);

      if (livesRef.current <= 0) {
        setTimeout(() => onFinished(scoreRef.current, 'LOST'), 200);
      }
    }
  };

  const activeObjective = objectives[currentObjectiveIndex];

  return (
    <div className={`relative w-full max-w-4xl bg-cyber-card/95 border rounded-lg p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md transition-all duration-100 ${errorFlash ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-cyber-border'}`}>

      {/* HUD Info Header */}
      <div className="w-full bg-cyber-card/90 border border-cyber-border rounded-lg p-4 flex justify-between items-center font-mono text-xs shadow-md select-none my-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BUFFER SCORE</span>
          <span className="text-emerald-400 font-bold text-sm sm:text-base text-glow-green">{score} PTS</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">STAGE</span>
          <span className="text-emerald-400 font-bold text-sm sm:text-base text-glow-green">{currentObjectiveIndex + 1}/4</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TIME REMAINING</span>
          <span className={`font-bold text-sm sm:text-base flex items-center gap-1 ${timeLeft <= 10 ? 'text-red-400 animate-pulse font-extrabold text-glow-red' : 'text-emerald-400 text-glow-green'}`}>
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Signal Indicator for lives */}
          <div className="flex items-end gap-1 h-5">
            <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">LINK:</span>
            <div className={`w-1.5 h-2.5 rounded-sm transition-colors ${lives >= 1 ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' : 'bg-slate-800'}`}></div>
            <div className={`w-1.5 h-3.5 rounded-sm transition-colors ${lives >= 2 ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' : 'bg-slate-800'}`}></div>
            <div className={`w-1.5 h-4.5 rounded-sm transition-colors ${lives >= 3 ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' : 'bg-slate-800'}`}></div>
          </div>
          <button onClick={onToggleMute} className="p-1.5 rounded text-slate-400 hover:text-emerald-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Falling Blocks Arena Screen */}
      <div className="relative w-full h-[380px] bg-slate-950 border border-cyber-border/60 rounded-md overflow-hidden my-3">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/5 shadow-[0_0_6px_rgba(16,185,129,0.1)] animate-scanline pointer-events-none"></div>

        {/* Flashing success notification banner */}
        <AnimatePresence>
          {flashBanner.visible && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 left-4 right-4 bg-emerald-950/90 border border-emerald-500/60 rounded p-2.5 text-center text-xs font-mono text-emerald-400 shadow-md z-30 select-none"
            >
              <span className="text-[9px] text-emerald-500 uppercase block font-bold tracking-widest">SUCCESSFUL INTERCEPT</span>
              <span className="font-bold text-sm">[{flashBanner.command}]</span>: {flashBanner.description}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level Banner */}
        <div className="absolute top-2 right-2 border border-cyber-border/50 bg-cyber-card/60 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 select-none">
          SECURE TERMINAL // OBJ {currentObjectiveIndex + 1} OF 4
        </div>

        {/* Falling command blocks */}
        {blocks.map((block) => (
          <div
            key={block.id}
            className="absolute bg-slate-950/90 border border-emerald-500/40 rounded px-3 py-1.5 text-emerald-300 font-mono font-bold text-[11px] sm:text-xs shadow-md glow-green select-none cursor-default"
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
            }}
          >
            {block.command}
          </div>
        ))}

        {/* Bucket (Prompt cursor) */}
        <div
          className="absolute min-h-[50px] bg-cyber-card/90 border-2 border-neon-green rounded-md flex items-center justify-center font-mono text-[9px] sm:text-[11px] text-emerald-400 select-none shadow-[0_0_10px_var(--color-neon-green-glow)] py-1.5"
          style={{
            left: `${bucketX}%`,
            top: '82%',
            width: '28%',
          }}
        >
          <div className="absolute -bottom-2.5 left-2 px-1 bg-slate-950 text-[8px] text-emerald-500 font-bold uppercase tracking-wider">
            root@sentinent
          </div>
          <span className="text-center font-bold px-2 uppercase font-mono leading-tight whitespace-normal break-words">
            {activeObjective?.text}
          </span>
        </div>
      </div>

      {/* Screen controls legend for Desktop & Touch screen navigation for Mobile */}
      <div className="w-full flex flex-col items-center select-none font-mono text-[10px] text-slate-500 mt-1">
        <span className="hidden sm:inline">← USE [A / D] OR [LEFT / RIGHT ARROWS] TO MOVE →</span>

        {/* Mobile controls overlay */}
        <div className="flex justify-between w-full max-w-xs gap-4 mt-2 sm:hidden">
          <button
            onMouseDown={() => { keysPressed.current.left = true; }}
            onMouseUp={() => { keysPressed.current.left = false; }}
            onMouseLeave={() => { keysPressed.current.left = false; }}
            onTouchStart={(e) => { e.preventDefault(); keysPressed.current.left = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current.left = false; }}
            className="flex-1 bg-slate-950 border border-cyber-border py-3.5 rounded text-center text-emerald-400 font-bold active:bg-emerald-900/30 text-lg shadow-sm"
          >
            ◀
          </button>
          <button
            onMouseDown={() => { keysPressed.current.right = true; }}
            onMouseUp={() => { keysPressed.current.right = false; }}
            onMouseLeave={() => { keysPressed.current.right = false; }}
            onTouchStart={(e) => { e.preventDefault(); keysPressed.current.right = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current.right = false; }}
            className="flex-1 bg-slate-950 border border-cyber-border py-3.5 rounded text-center text-emerald-400 font-bold active:bg-emerald-900/30 text-lg shadow-sm"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. END GAME STATS SCREENS
// ==========================================
interface EndScreenProps {
  score: number;
  status: 'WON' | 'LOST';
  onRestart: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ score, status, onRestart }) => {
  const isPassed = status === 'WON';

  useEffect(() => {
    if (isPassed) {
      sound.playVictory();
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#10b981', '#34d399']
      });
    } else {
      sound.playGameOver();
    }
  }, [isPassed]);

  return (
    <div className="w-full max-w-md bg-cyber-card/95 border border-cyber-border rounded-lg p-6 shadow-2xl space-y-6 backdrop-blur-md relative select-none">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

      <div className="text-center border-b border-cyber-border/40 pb-3">
        <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ASSESSMENT COMPLETE</span>
        <h2 className="font-mono text-slate-100 text-xl font-extrabold uppercase mt-0.5">
          {isPassed ? 'MISSION COMPLETE' : 'SYSTEM COMPROMISED'}
        </h2>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/60 border border-cyber-border/40 rounded p-4">
        <div className="w-16 h-16 rounded border border-dashed border-emerald-500/30 flex items-center justify-center bg-slate-950">
          {isPassed ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
          )}
        </div>
        <div className="font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ASSESSMENT STATUS</span>
          <div className={`text-base font-bold tracking-wider ${isPassed ? 'text-emerald-400' : 'text-red-500'}`}>
            {isPassed ? 'ACCESS GRANTED' : 'LOCKOUT RENDERED'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            {isPassed ? 'ALL SECURITY PARMETERS VERIFIED' : 'BUFFER OVERRUN // TERMINATED'}
          </span>
        </div>
      </div>

      <div className="bg-slate-950/30 p-4 rounded border border-cyber-border/30 font-mono text-xs flex justify-between items-center px-4 py-3">
        <span className="text-slate-500 font-semibold uppercase">FINAL SECURE SCORE:</span>
        <span className="text-emerald-400 font-extrabold text-sm">{score} PTS</span>
      </div>

      {!isPassed && (
        <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-200 text-left font-sans font-medium">
          <p className="text-red-400 font-mono">
            ⚠️ Retraining recommended. Your link fell out of synchronization with the Sentinel objectives. Review standard Unix commands and retry.
          </p>
        </div>
      )}

      {isPassed && (
        <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-200 text-left font-sans font-medium">
          <p className="text-emerald-400 font-mono">
            🛡️ Core authentication cleared. The firewall is stable, and local node directories are synchronized. Ready for deployment.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs py-3 px-3 rounded border border-cyber-border hover:border-emerald-500/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY
        </button>
        <button
          onClick={() => {
            sound.playClick();
            alert('CLASSIFIED: Transitioning to Module 3 node...');
          }}
          disabled={!isPassed}
          className={`flex-1 font-mono font-bold text-xs py-3 px-3 rounded border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isPassed
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm animate-pulse'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
            }`}
        >
          PROCEED
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 7. ORCHESTRATOR
// ==========================================
function Modul2Game() {
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'FINISHED'>('INTRO');
  const [results, setResults] = useState<{ score: number; status: 'WON' | 'LOST' } | null>(null);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMute(nextMute);
    sound.playClick();
  };

  const handleStart = () => {
    setGameState('PLAYING');
  };

  const handleFinished = (finalScore: number, finalStatus: 'WON' | 'LOST') => {
    setResults({ score: finalScore, status: finalStatus });
    setGameState('FINISHED');
  };

  const handleRestart = () => {
    setResults(null);
    setGameState('INTRO');
  };

  return (
    <div className="w-full relative min-h-screen flex flex-col justify-between crt-overlay">
      <TelemetryOverlay />

      <main className="w-full relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md text-center select-none pt-2 pb-4 font-mono">
          <div className="text-[11px] text-emerald-400/50 font-bold tracking-[0.25em] uppercase">
            PROJECT SENTINEL
          </div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1">
            FIELD ASSESSMENT 02
          </div>
        </div>

        {gameState === 'INTRO' && (
          <IntroScreen onStart={handleStart} isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {gameState === 'PLAYING' && (
          <GameScreen
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onFinished={handleFinished}
          />
        )}

        {gameState === 'FINISHED' && results && (
          <EndScreen score={results.score} status={results.status} onRestart={handleRestart} />
        )}
      </main>

      <footer className="relative z-10 py-2.5 border-t border-cyber-border/30 text-center font-mono text-[9px] text-slate-600 select-none bg-slate-950/20 backdrop-blur-sm">
        SECURE TRAINING CORE // SHELL BUFFER ENGAGED
      </footer>
    </div>
  );
}

export default Modul2Game;
