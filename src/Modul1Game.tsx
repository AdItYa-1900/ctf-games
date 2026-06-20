import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Shield, Volume2, VolumeX, AlertTriangle, Clock, CheckCircle2, ShieldAlert, ChevronRight, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. DATASETS & INTERFACES
// ==========================================
export interface Question {
  id: string;
  statement: string;
  isFact: boolean; // true = FACT (Swipe Right), false = MYTH (Swipe Left)
  explanation: string;
  category: string;
}

export const questions: Question[] = [
  {
    id: 'q1',
    statement: 'Hackers always wear hoodies and work alone.',
    isFact: false,
    explanation: 'Many hackers work in teams, companies, governments, or security firms. The hoodie stereotype comes from movies.',
    category: 'Hackers'
  },
  {
    id: 'q2',
    statement: 'Phishing is a type of cyber attack.',
    isFact: true,
    explanation: 'Phishing uses fake emails, messages, or websites to trick victims into revealing information.',
    category: 'Threats'
  },
  {
    id: 'q3',
    statement: 'Cybersecurity only matters for large companies.',
    isFact: false,
    explanation: 'Individuals, students, small businesses, and governments can all be targeted by cybercriminals.',
    category: 'Fundamentals'
  },
  {
    id: 'q4',
    statement: 'Confidentiality is part of the CIA Triad.',
    isFact: true,
    explanation: 'The CIA Triad consists of Confidentiality, Integrity, and Availability.',
    category: 'CIA Triad'
  },
  {
    id: 'q5',
    statement: 'White-hat hackers are authorized to test systems.',
    isFact: true,
    explanation: 'White-hat hackers work with permission to identify and report security weaknesses.',
    category: 'Hackers'
  },
  {
    id: 'q6',
    statement: 'Ransomware can prevent users from accessing their files.',
    isFact: true,
    explanation: 'Ransomware often encrypts files and demands payment for their recovery.',
    category: 'Threats'
  },
  {
    id: 'q7',
    statement: 'Integrity means keeping information accurate and unaltered.',
    isFact: true,
    explanation: 'Integrity ensures data remains trustworthy and unchanged by unauthorized parties.',
    category: 'CIA Triad'
  },
  {
    id: 'q8',
    statement: 'Availability focuses on making systems accessible when needed.',
    isFact: true,
    explanation: 'If a service is unavailable to legitimate users, availability has been compromised.',
    category: 'CIA Triad'
  },
  {
    id: 'q9',
    statement: 'All hackers are cybercriminals.',
    isFact: false,
    explanation: 'Many hackers work in cybersecurity roles protecting organizations from attacks.',
    category: 'Hackers'
  },
  {
    id: 'q10',
    statement: 'Strong passwords help improve security.',
    isFact: true,
    explanation: 'Strong, unique passwords make it significantly harder for attackers to gain unauthorized access.',
    category: 'Fundamentals'
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

  public playSwipe() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  public playCorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.07); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.25);
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
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn(e);
    }
  }

  public playCountdown() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
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

  public playVictory() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

const sound = new SoundManager();

// ==========================================
// 3. TELEMETRY & SUBCOMPONENTS
// ==========================================
const TelemetryOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg">
      <div className="absolute inset-0 cyber-grid opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500/5 shadow-[0_0_6px_rgba(162,88,255,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-purple-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-purple-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-purple-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-purple-500/20"></div>
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
    <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-purple-500 rounded-lg p-6 shadow-[0_0_20px_rgba(162,88,255,0.35)] text-center relative overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
        <div className="flex items-center gap-1.5 text-purple-400 text-sm font-mono tracking-widest font-bold">
          <Shield className="w-4 h-4" />
          PROJECT SENTINEL
        </div>
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-purple-400 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
        </button>
      </div>

      <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">
        FIELD ASSESSMENT
      </h1>
      <h2 className="font-mono text-purple-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
        Knowledge alone does not stop cyberattacks, Agent.
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
                Before Project Sentinel can trust you with active investigations, you must demonstrate that you understand the fundamentals covered in this training module.
              </p>
              
              <div className="border-l-2 border-purple-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-purple-300 uppercase tracking-wider font-bold font-mono">MISSION PARAMETERS:</p>
                <p className="text-slate-300 font-sans text-xs sm:text-[13px]">
                  You are about to enter your first Field Assessment. This is a gamified mission designed to test your understanding of:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-400 text-xs sm:text-[13px] font-sans mt-1">
                  <li>Cybersecurity fundamentals</li>
                  <li>Types of hackers</li>
                  <li>The CIA Triad</li>
                  <li>Real-world cyber threats</li>
                  <li>The objectives of Project Sentinel</li>
                </ul>
              </div>

              <p className="text-slate-300 font-sans text-xs sm:text-[13px]">
                Your performance will determine whether you are ready to continue the investigation into Obsidian. Pay close attention to the questions, think carefully before making decisions, and remember what you've learned.
              </p>

              <div className="bg-purple-950/10 border border-purple-950/30 rounded p-3 text-center italic text-xs sm:text-sm text-purple-300 font-sans font-medium">
                "Knowledge is learned in the classroom. Skill is earned in the field."
                <span className="block not-italic text-[10px] text-slate-500 font-mono mt-1 font-bold">— Project Sentinel Training Division</span>
              </div>

              <p className="text-amber-400 text-xs font-sans font-semibold">
                ⚠️ Mistakes are expected. Every mistake is an opportunity to learn.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-center font-bold">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2.5">
                  <span className="text-emerald-400 text-sm">FACT</span>
                  <span className="text-slate-500 text-[10px] block mt-0.5 font-normal">Swipe Right or →</span>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded p-2.5">
                  <span className="text-red-400 text-sm">MYTH</span>
                  <span className="text-slate-500 text-[10px] block mt-0.5 font-normal">Swipe Left or ←</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 font-mono">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest">
                Click Start Mission to begin your first field operation.
              </p>
              <form onSubmit={handleStart}>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-purple-500 shadow-md cursor-pointer transition-all uppercase animate-pulse"
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
            <div className="font-mono text-xs sm:text-sm text-purple-400 flex flex-col items-center gap-2">
              <span className="animate-pulse font-bold tracking-wider">
                DECRYPTING SIMULATOR MODULES...
              </span>
            </div>
            <div className="w-full bg-slate-950 border border-cyber-border rounded h-4 overflow-hidden p-[1px]">
              <div
                className="h-full bg-purple-600/80 rounded transition-all duration-700"
                style={{ width: `${decryptProgress}%` }}
              ></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CardProps {
  question: Question;
  index: number;
  total: number;
  isActive: boolean;
  onSwipe: (isFact: boolean) => void;
}

const Card: React.FC<CardProps> = ({ question, index, total, isActive, onSwipe }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);
  const controls = useAnimation();

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') swipeRight();
      if (e.key === 'ArrowLeft') swipeLeft();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive]);

  const swipeRight = async () => {
    sound.playSwipe();
    await controls.start({ x: 300, y: 20, rotate: 10, opacity: 0, transition: { duration: 0.2 } });
    onSwipe(true);
  };

  const swipeLeft = async () => {
    sound.playSwipe();
    await controls.start({ x: -300, y: 20, rotate: -10, opacity: 0, transition: { duration: 0.2 } });
    onSwipe(false);
  };

  const handleDragEnd = async (_e: any, info: PanInfo) => {
    if (!isActive) return;
    const thresh = 90;
    if (info.offset.x > thresh) {
      swipeRight();
    } else if (info.offset.x < -thresh) {
      swipeLeft();
    } else {
      controls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } });
    }
  };

  const stackOffset = Math.min(2, index);
  const yOffset = stackOffset * 8;
  const scale = 1 - stackOffset * 0.03;

  return (
    <motion.div
      drag={isActive}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{
        x,
        y: isActive ? 0 : yOffset,
        rotate: isActive ? rotate : 0,
        scale,
        zIndex: total - index,
      }}
      className={`absolute w-full max-w-[340px] h-[380px] rounded-lg p-6 flex flex-col justify-between border cursor-grab active:cursor-grabbing backdrop-blur-sm select-none ${
        isActive
          ? 'bg-cyber-card border-cyber-border shadow-xl glow-purple'
          : 'bg-cyber-card/70 border-cyber-border/40 opacity-60 pointer-events-none'
      }`}
    >
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold">
        <span>CATEGORY: {question.category.toUpperCase()}</span>
        <span>{index + 1} / {total}</span>
      </div>

      {isActive && (
        <>
          <motion.div
            style={{ opacity: rightOpacity }}
            className="absolute inset-0 bg-emerald-950/90 border-2 border-emerald-500 rounded-lg flex flex-col items-center justify-center pointer-events-none text-emerald-400 font-mono font-bold tracking-wider z-20"
          >
            <CheckCircle2 className="w-10 h-10 mb-2" />
            <span className="text-sm">FACT VERIFIED</span>
          </motion.div>
          <motion.div
            style={{ opacity: leftOpacity }}
            className="absolute inset-0 bg-red-950/90 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center pointer-events-none text-red-400 font-mono font-bold tracking-wider z-20"
          >
            <ShieldAlert className="w-10 h-10 mb-2" />
            <span className="text-sm">MYTH IDENTIFIED</span>
          </motion.div>
        </>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-center my-4">
        <p className="font-sans text-[15px] sm:text-[17px] text-slate-100 leading-relaxed font-semibold px-1">
          "{question.statement}"
        </p>
      </div>

      <div className="border-t border-cyber-border/40 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-400 font-medium">
        <span>← SWIPE MYTH</span>
        <span>SWIPE FACT →</span>
      </div>
    </motion.div>
  );
};

interface CardStackProps {
  questions: Question[];
  currentIndex: number;
  onSwipe: (choice: boolean) => void;
}

const CardStack: React.FC<CardStackProps> = ({ questions, currentIndex, onSwipe }) => {
  const cardsToRender = questions
    .map((q, idx) => ({ question: q, index: idx }))
    .slice(currentIndex, currentIndex + 3);

  return (
    <div className="relative w-full max-w-[340px] h-[380px] flex items-center justify-center">
      <AnimatePresence>
        {cardsToRender.length > 0 ? (
          cardsToRender.map(({ question, index }, idx) => {
            const isActive = idx === 0;
            return (
              <Card
                key={question.id}
                question={question}
                index={index}
                total={questions.length}
                isActive={isActive}
                onSwipe={onSwipe}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-purple-500/20 bg-cyber-card/30 rounded-lg w-full h-[360px] font-mono text-purple-400 text-sm">
            <Shield className="w-10 h-10 text-purple-500/40 mb-3 animate-pulse" />
            <span>ANALYSIS COMPLETE</span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface GameScreenProps {
  questions: Question[];
  isMuted: boolean;
  onToggleMute: () => void;
  onFinished: (results: {
    score: number;
    accuracy: number;
    bestStreak: number;
    avgResponseTime: number;
    xpFundamentals: number;
    xpThreat: number;
    reputation: number;
  }) => void;
}

interface FloatingText {
  id: number;
  text: string;
  color: string;
}

const GameScreen: React.FC<GameScreenProps> = ({
  questions,
  isMuted,
  onToggleMute,
  onFinished,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatCounter = useRef(0);

  const cardStartTime = useRef(Date.now());
  const responseTimes = useRef<number[]>([]);

  const [wrongAnswerState, setWrongAnswerState] = useState<{
    isOpen: boolean;
    question: Question | null;
  }>({ isOpen: false, question: null });

  const [expTime, setExpTime] = useState(4);
  const expTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cardStartTime.current = Date.now();
    const mainTimer = setInterval(() => {
      // Pause active card countdown when correct/incorrect modal details are shown
      if (wrongAnswerState.isOpen) return;

      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 20;
        }
        if (prev <= 6) sound.playCountdown(); // play warning tick-down for the last 5 seconds
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(mainTimer);
  }, [currentIndex, wrongAnswerState.isOpen]);

  const triggerFloat = (text: string, color: string = 'text-purple-400') => {
    const id = floatCounter.current++;
    setFloatingTexts((prev) => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 1000);
  };

  const handleTimeout = () => {
    sound.playIncorrect();
    setStreak(0);
    triggerFloat('TIME EXPIRED', 'text-red-400 font-semibold text-sm');

    const q = questions[currentIndex];
    setWrongAnswerState({ isOpen: true, question: q });
    setExpTime(4);
    expTimer.current = setInterval(() => {
      setExpTime((prev) => {
        if (prev <= 1) {
          if (expTimer.current) clearInterval(expTimer.current);
          closeExplanation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGameOver = () => {
    const totalAssessed = currentIndex;
    const accuracy = totalAssessed > 0 ? Math.round((correctCount / totalAssessed) * 100) : 0;
    const avgResponseTime = responseTimes.current.length > 0
      ? parseFloat((responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length).toFixed(2))
      : 0;

    const xpFundamentals = Math.round(correctCount * 15 + bestStreak * 10);
    const xpThreat = Math.round(score * 0.05 + accuracy * 2);
    const reputation = Math.round(score * 0.01 + bestStreak * 3);

    onFinished({
      score,
      accuracy,
      bestStreak,
      avgResponseTime,
      xpFundamentals,
      xpThreat,
      reputation,
    });
  };

  const handleSwipe = (playerChoice: boolean) => {
    const q = questions[currentIndex];
    const isCorrect = playerChoice === q.isFact;
    const elapsed = (Date.now() - cardStartTime.current) / 1000;
    responseTimes.current.push(elapsed);

    if (isCorrect) {
      sound.playCorrect();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) setBestStreak(nextStreak);

      let multi = 1.0;
      if (nextStreak >= 10) multi = 2.0;
      else if (nextStreak >= 5) multi = 1.5;
      else if (nextStreak >= 3) multi = 1.2;

      let speedBonus = 0;
      let bonusText = '';
      if (elapsed < 2.0) {
        speedBonus = 50;
        bonusText = ' (+50 Speed)';
      } else if (elapsed < 4.0) {
        speedBonus = 25;
        bonusText = ' (+25 Speed)';
      }

      const added = Math.round(100 * multi + speedBonus);
      setScore((p) => p + added);
      setCorrectCount((p) => p + 1);

      triggerFloat(`+${added} PTS${bonusText}`, 'text-emerald-400 font-bold text-sm');
      if (nextStreak === 3 || nextStreak === 5 || nextStreak === 10) {
        triggerFloat(`STREAK x${multi}!`, 'text-amber-400 font-extrabold text-sm');
      }

      advance();
    } else {
      sound.playIncorrect();
      setStreak(0);
      triggerFloat('STREAK RESET', 'text-red-400 font-semibold text-sm');

      setWrongAnswerState({ isOpen: true, question: q });
      setExpTime(4);
      expTimer.current = setInterval(() => {
        setExpTime((prev) => {
          if (prev <= 1) {
            if (expTimer.current) clearInterval(expTimer.current);
            closeExplanation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const closeExplanation = () => {
    if (expTimer.current) {
      clearInterval(expTimer.current);
      expTimer.current = null;
    }
    setWrongAnswerState({ isOpen: false, question: null });
    advance();
  };

  const advance = () => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setTimeout(() => handleGameOver(), 300);
    } else {
      setCurrentIndex(next);
      setTimeLeft(20); // Reset timer to 20s for the next card
      cardStartTime.current = Date.now();
    }
  };

  useEffect(() => {
    if (!wrongAnswerState.isOpen) return;
    const handleDismissKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        sound.playClick();
        closeExplanation();
      }
    };
    window.addEventListener('keydown', handleDismissKey);
    return () => window.removeEventListener('keydown', handleDismissKey);
  }, [wrongAnswerState.isOpen]);

  const progress = Math.round((currentIndex / questions.length) * 100);

  return (
    <div className="w-full max-w-md flex flex-col items-center justify-between p-4 flex-1 space-y-4">
      <div className="w-full bg-cyber-card/90 border border-cyber-border rounded-lg p-4 flex justify-between items-center font-mono text-sm shadow-md select-none">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase">RECRUIT EVALUATION</span>
          <span className="text-purple-400 font-bold text-base">{score} PTS</span>
        </div>

        <div className="flex flex-col items-center">
          {streak >= 3 && (
            <span className="text-xs font-bold text-amber-400 animate-pulse">
              STREAK x{streak >= 10 ? '2.0' : streak >= 5 ? '1.5' : '1.2'}
            </span>
          )}
          <span className="text-xs text-slate-300">Streak: {streak}</span>
        </div>

        <div className="flex items-center gap-2 border-l border-cyber-border/40 pl-3">
          <div className={`flex flex-col items-end ${timeLeft <= 5 ? 'text-red-400 animate-pulse font-bold' : 'text-slate-300'}`}>
            <span className="text-[10px] text-slate-500 font-bold">CARD TIME</span>
            <span className="text-sm sm:text-base font-bold flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeLeft}s
            </span>
          </div>
          <button onClick={onToggleMute} className="p-1 rounded text-slate-400 hover:text-purple-400">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-950 border border-cyber-border rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-purple-600/80 transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="h-5 relative w-full overflow-visible pointer-events-none select-none">
        <AnimatePresence>
          {floatingTexts.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -25 }}
              exit={{ opacity: 0 }}
              className={`absolute left-1/2 -translate-x-1/2 font-mono text-xs ${f.color}`}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex items-center justify-center w-full py-2">
        <CardStack questions={questions} currentIndex={currentIndex} onSwipe={handleSwipe} />
      </div>

      <div className="w-full flex justify-center gap-5 py-2 select-none">
        <button
          onClick={() => handleSwipe(false)}
          className="px-5 py-2.5 border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 text-red-400 font-mono text-sm rounded transition-all cursor-pointer font-bold"
        >
          MYTH [←]
        </button>
        <button
          onClick={() => handleSwipe(true)}
          className="px-5 py-2.5 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-400 font-mono text-sm rounded transition-all cursor-pointer font-bold"
        >
          FACT [→]
        </button>
      </div>

      <AnimatePresence>
        {wrongAnswerState.isOpen && wrongAnswerState.question && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-cyber-card border border-red-500 rounded-lg p-6 text-center relative shadow-2xl">
              <div className="flex items-center justify-center gap-1.5 text-red-500 font-mono text-sm font-bold mb-4">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                INCORRECT CLASSIFICATION
              </div>

              <div className="bg-slate-950/80 border border-cyber-border rounded p-4 text-left font-mono text-sm text-slate-300 space-y-3 mb-5">
                <p className="italic text-slate-100 font-sans text-[14px] sm:text-[15px] leading-relaxed">"{wrongAnswerState.question.statement}"</p>
                <div className="border-t border-cyber-border/40 pt-2.5">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Correct Type:</span>
                  <span className={`text-sm font-bold tracking-wider ${wrongAnswerState.question.isFact ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wrongAnswerState.question.isFact ? 'FACT / TRUE' : 'MYTH / FALSE'}
                  </span>
                </div>
                <div className="border-t border-cyber-border/40 pt-2.5">
                  <span className="text-purple-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wider">Debrief:</span>
                  <span className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">{wrongAnswerState.question.explanation}</span>
                </div>
              </div>

              <button
                onClick={closeExplanation}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold text-xs py-3 rounded border border-red-500/40 transition-all cursor-pointer uppercase tracking-wider"
              >
                CONTINUE ({expTime}s)
              </button>
              <div className="text-[10px] text-slate-500 font-mono mt-2">
                Press [ENTER] or [SPACE] to skip
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EndScreenProps {
  results: {
    score: number;
    accuracy: number;
    bestStreak: number;
    avgResponseTime: number;
    xpFundamentals: number;
    xpThreat: number;
    reputation: number;
  };
  onRestart: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ results, onRestart }) => {
  const isPassed = results.accuracy >= 50;
  let rating = 'D  Retraining Required';
  let ratingColor = 'text-red-500';

  if (results.accuracy >= 95) {
    rating = 'A+ Elite Recruit';
    ratingColor = 'text-emerald-400';
  } else if (results.accuracy >= 85) {
    rating = 'A  Sentinel Ready';
    ratingColor = 'text-purple-400';
  } else if (results.accuracy >= 70) {
    rating = 'B  Qualified';
    ratingColor = 'text-emerald-600';
  } else if (results.accuracy >= 50) {
    rating = 'C  Needs Practice';
    ratingColor = 'text-amber-500';
  }

  useEffect(() => {
    if (isPassed) {
      sound.playVictory();
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#a258ff', '#10b981']
      });
    } else {
      sound.playIncorrect();
    }
  }, [isPassed]);

  return (
    <div className="w-full max-w-md bg-cyber-card/95 border border-cyber-border rounded-lg p-6 shadow-2xl space-y-5 backdrop-blur-md relative select-none">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
      
      <div className="text-center border-b border-cyber-border/40 pb-3">
        <span className="font-mono text-[10px] text-purple-400 font-bold uppercase tracking-wider">EVALUATION DOSSIER</span>
        <h2 className="font-mono text-slate-100 text-xl font-extrabold uppercase mt-0.5">
          Assessment Report
        </h2>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/60 border border-cyber-border/40 rounded p-4">
        <div className="w-16 h-16 rounded border border-dashed border-purple-500/30 flex items-center justify-center bg-slate-950 font-mono text-3xl font-bold text-purple-400">
          {results.accuracy >= 95 ? 'A+' : results.accuracy >= 85 ? 'A' : results.accuracy >= 70 ? 'B' : results.accuracy >= 50 ? 'C' : 'D'}
        </div>
        <div className="font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">MISSION RATING</span>
          <div className={`text-base font-bold tracking-wider ${ratingColor}`}>{rating.toUpperCase()}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isPassed ? 'ACCESS GRANTED // CLEARED' : 'ACCESS RESTRICTED // RETRY REQUIRED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 font-mono text-xs bg-slate-950/30 p-4 rounded border border-cyber-border/30">
        <div className="flex justify-between items-center px-1.5 py-1">
          <span className="text-slate-500 font-semibold">SCORE:</span>
          <span className="text-purple-400 font-extrabold text-sm">{results.score}</span>
        </div>
        <div className="flex justify-between items-center px-1.5 py-1 border-l border-cyber-border/30">
          <span className="text-slate-500 font-semibold">ACCURACY:</span>
          <span className="text-slate-200 text-sm font-bold">{results.accuracy}%</span>
        </div>
        <div className="flex justify-between items-center px-1.5 py-1 border-t border-cyber-border/30">
          <span className="text-slate-500 font-semibold">STREAK:</span>
          <span className="text-slate-200 text-sm font-bold">{results.bestStreak}</span>
        </div>
        <div className="flex justify-between items-center px-1.5 py-1 border-t border-l border-cyber-border/30">
          <span className="text-slate-500 font-semibold">RESP TIME:</span>
          <span className="text-slate-200 text-sm font-bold">{results.avgResponseTime}s</span>
        </div>
      </div>

      {!isPassed && (
        <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-200 text-left font-sans font-medium">
          <p className="text-red-400">
            Dossier validation failed. Retraining recommended. Review the basic concepts and retry the simulation.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs py-3 px-3 rounded border border-cyber-border hover:border-purple-500/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY
        </button>
        <button
          onClick={() => {
            sound.playClick();
            alert('CLASSIFIED: Transitioning to Obsidian node...');
          }}
          disabled={!isPassed}
          className={`flex-1 font-mono font-bold text-xs py-3 px-3 rounded border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            isPassed
              ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-sm'
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
// 4. MAIN ORCHESTRATOR
// ==========================================
function Modul1Game() {
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'FINISHED'>('INTRO');
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<{
    score: number;
    accuracy: number;
    bestStreak: number;
    avgResponseTime: number;
    xpFundamentals: number;
    xpThreat: number;
    reputation: number;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMute(nextMute);
    sound.playClick();
  };

  const shuffleArray = (array: Question[]): Question[] => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const handleStart = () => {
    setShuffledQuestions(shuffleArray(questions));
    setGameState('PLAYING');
  };

  const handleFinished = (finalResults: typeof results) => {
    setResults(finalResults);
    setGameState('FINISHED');
  };

  const handleRestart = () => {
    setResults(null);
    setGameState('INTRO');
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between crt-overlay">
      <TelemetryOverlay />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md text-center select-none pt-2 pb-4 font-mono">
          <div className="text-[11px] text-purple-400/50 font-bold tracking-[0.25em] uppercase">
            PROJECT SENTINEL
          </div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1">
            FIELD ASSESSMENT 01
          </div>
        </div>

        {gameState === 'INTRO' && (
          <IntroScreen onStart={handleStart} isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {gameState === 'PLAYING' && (
          <GameScreen
            questions={shuffledQuestions}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onFinished={handleFinished}
          />
        )}

        {gameState === 'FINISHED' && results && (
          <EndScreen results={results} onRestart={handleRestart} />
        )}
      </main>

      <footer className="relative z-10 py-2.5 border-t border-cyber-border/30 text-center font-mono text-[9px] text-slate-600 select-none bg-slate-950/20 backdrop-blur-sm">
        SECURE TRAINING CORE // THREAT FEED DISENGAGED
      </footer>
    </div>
  );
}

export default Modul1Game;
