import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw, ChevronRight, AlertTriangle, CheckCircle2, Terminal, FileKey } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. SYNTHESIZED SOUND SYSTEM (Web Audio API)
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
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
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
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.setValueAtTime(800, now + 0.07);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.18);
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
      osc.frequency.linearRampToValueAtTime(70, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.25);
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
}

const sound = new SoundManager();

// ==========================================
// 2. BACKGROUND EFFECTS
// ==========================================
const TelemetryOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg">
      <div className="absolute inset-0 cyber-grid opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/5 shadow-[0_0_6px_rgba(239,68,68,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-red-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-red-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-red-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-red-500/20"></div>
    </div>
  );
};

// ==========================================
// 3. INTRO SCREEN
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
    <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-red-500 rounded-lg p-6 shadow-[0_0_20px_rgba(239,68,68,0.35)] text-center relative overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
        <div className="flex items-center gap-1.5 text-red-400 text-sm font-mono tracking-widest font-bold">
          <Terminal className="w-4 h-4" />
          PROJECT SENTINEL
        </div>
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-red-400 cursor-pointer animate-none"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
        </button>
      </div>

      <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">
        FIELD ASSESSMENT 05
      </h1>
      <h2 className="font-mono text-red-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
        Mission: Who Stole the Key?
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
                Agent, obsidian's secure fileserver has been breached. A decryption key file (`secret.key`) has been accessed. Local authorization limits mean only users with specific privileges could have read the file.
              </p>

              <div className="border-l-2 border-red-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-red-400 uppercase tracking-wider font-bold font-mono">INCIDENT REPORT:</p>
                <div className="text-slate-400 text-xs sm:text-[13px] font-sans mt-1 space-y-1">
                  <div>• Breached target file: <span className="text-red-400 font-mono font-bold">secret.key</span></div>
                  <div>• File permissions: <span className="text-red-400 font-mono font-bold">-rw-r-----</span></div>
                  <div>• File Owner: <span className="text-red-400 font-mono font-bold">shadow</span> | Group: <span className="text-red-400 font-mono font-bold">admins</span></div>
                </div>
              </div>

              <div className="border-l-2 border-red-500/50 pl-3 py-1 space-y-1">
                <p className="text-xs text-red-400 uppercase tracking-wider font-bold font-mono">YOUR DEPLOYMENT OBJECTIVES:</p>
                <div className="text-slate-400 text-xs sm:text-[13px] font-sans mt-1 space-y-1">
                  <div>1. Map suspect user profiles and group list structures.</div>
                  <div>2. Identify all suspects whose UNIX authorizations grant them read access to the key.</div>
                  <div>3. Interrogate the secure audit logs to isolate the exact infiltrator.</div>
                </div>
              </div>

              <p className="text-slate-400 font-sans text-xs sm:text-[13px]">
                Time is of the essence. We must lock down the target and isolate the infiltrator before they delete the secure audit log data.
              </p>
            </div>

            <div className="space-y-3 font-mono">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest">
                Click Start Mission to establish telemetry link.
              </p>
              <form onSubmit={handleStart}>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase animate-pulse"
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
            <div className="font-mono text-xs sm:text-sm text-red-400 flex flex-col items-center gap-2">
              <span className="animate-pulse font-bold tracking-wider">
                DECRYPTING SIMULATOR MODULES...
              </span>
            </div>
            <div className="w-full bg-slate-950 border border-cyber-border rounded h-4 overflow-hidden p-[1px]">
              <div
                className="h-full bg-red-600/80 rounded transition-all duration-700"
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
// 4. MAIN GAME ORCHESTRATOR
// ==========================================
interface Suspect {
  id: string;
  name: string;
  groups: string[];
  avatarColor: string;
}

const suspectsList: Suspect[] = [
  { id: 'alex', name: 'alex', groups: ['users'], avatarColor: 'from-pink-500 to-purple-600' },
  { id: 'sam', name: 'sam', groups: ['users', 'admins'], avatarColor: 'from-blue-500 to-cyan-600' },
  { id: 'morgan', name: 'morgan', groups: ['users'], avatarColor: 'from-yellow-500 to-orange-600' },
  { id: 'shadow', name: 'shadow', groups: ['admins'], avatarColor: 'from-slate-700 to-slate-900' }
];

interface PermissionRound {
  file: string;
  permissions: string;
  owner: string;
  group: string;
  question: string;
  correctAnswers: string[];
  explanation: string;
  learnBreakdown: {
    owner: string;
    group: string;
    others: string;
  };
}

const permissionRounds: PermissionRound[] = [
  {
    file: 'secret.key',
    permissions: '-rw-r-----',
    owner: 'shadow',
    group: 'admins',
    question: 'Analyze the Unix permission settings above. Which suspect(s) possess authorization privileges to read secret.key? (Select all that apply)',
    correctAnswers: ['sam', 'shadow'],
    explanation: 'Correct! Both sam (in group admins) and shadow (file owner) possess UNIX authorization to read the key file. All other users are blocked.',
    learnBreakdown: {
      owner: 'Read + Write',
      group: 'Read',
      others: 'No Access'
    }
  },
  {
    file: 'backup.sh',
    permissions: '-rwxr-x---',
    owner: 'morgan',
    group: 'users',
    question: 'Analyze the Unix permission settings above. Which suspect(s) possess authorization privileges to execute backup.sh? (Select all that apply)',
    correctAnswers: ['alex', 'sam', 'morgan'],
    explanation: 'Correct! Owner morgan (rwx) and group users members alex and sam (r-x) can execute the file. shadow is in group admins (others) and has no access.',
    learnBreakdown: {
      owner: 'Read + Write + Execute',
      group: 'Read + Execute',
      others: 'No Access'
    }
  },
  {
    file: 'admin_log.txt',
    permissions: '-rw-------',
    owner: 'sam',
    group: 'admins',
    question: 'Analyze the Unix permission settings above. Which suspect(s) possess authorization privileges to write to admin_log.txt? (Select all that apply)',
    correctAnswers: ['sam'],
    explanation: 'Correct! Only the owner sam (rw-) can write/modify this file. Since group and others permissions are completely blank (---), even shadow (group admins) has no access.',
    learnBreakdown: {
      owner: 'Read + Write',
      group: 'No Access',
      others: 'No Access'
    }
  }
];

const Modul5Game: React.FC = () => {
  const [gameState, setGameState] = useState<'INTRO' | 'PHASE_1' | 'PHASE_2' | 'WON'>('INTRO');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  // Phase 1 states
  const [selectedSuspects, setSelectedSuspects] = useState<string[]>([]);
  const [phase1Feedback, setPhase1Feedback] = useState<{ isChecked: boolean; isCorrect: boolean; message: string } | null>(null);
  const [currentRound, setCurrentRound] = useState(0);

  // Phase 2 states
  const [selectedThief, setSelectedThief] = useState<string | null>(null);
  const [phase2Feedback, setPhase2Feedback] = useState<{ isChecked: boolean; isCorrect: boolean; message: string } | null>(null);
  const [logTerminalLines, setLogTerminalLines] = useState<string[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMute(nextMute);
    sound.playClick();
  };

  const handleStartMission = () => {
    setSelectedSuspects([]);
    setPhase1Feedback(null);
    setSelectedThief(null);
    setPhase2Feedback(null);
    setLogTerminalLines([]);
    setCurrentRound(0);
    setGameState('PHASE_1');
  };

  // Check Phase 1 suspects selection
  const handleToggleSelectSuspect = (suspectId: string) => {
    if (phase1Feedback?.isChecked) return;
    sound.playClick();
    setSelectedSuspects((prev) =>
      prev.includes(suspectId) ? prev.filter((id) => id !== suspectId) : [...prev, suspectId]
    );
  };

  const handleVerifyPhase1 = () => {
    sound.playClick();
    const activeRound = permissionRounds[currentRound];
    
    const isCorrect = selectedSuspects.length === activeRound.correctAnswers.length &&
                      selectedSuspects.every(id => activeRound.correctAnswers.includes(id));

    if (isCorrect) {
      sound.playCorrect();
      setPhase1Feedback({
        isChecked: true,
        isCorrect: true,
        message: activeRound.explanation
      });
    } else {
      sound.playIncorrect();
      
      let errorMsg = 'Invalid authorization mapping. ';
      if (currentRound === 0) {
        const isAlexSelected = selectedSuspects.includes('alex');
        const isMorganSelected = selectedSuspects.includes('morgan');
        const isSamSelected = selectedSuspects.includes('sam');
        const isShadowSelected = selectedSuspects.includes('shadow');
        if (isAlexSelected || isMorganSelected) {
          errorMsg += 'Note that alex and morgan are only in the group "users". Since the permission is -rw-r-----, "others" have zero access (---). ';
        }
        if (!isSamSelected || !isShadowSelected) {
          errorMsg += 'Remember: Owner is shadow (reads via user permissions), and group is admins (which includes sam, reading via group permissions). ';
        }
      } else if (currentRound === 1) {
        const isShadowSelected = selectedSuspects.includes('shadow');
        if (isShadowSelected) {
          errorMsg += 'shadow is only in group "admins". Since the permission is -rwxr-x---, others have no access (---). ';
        } else {
          errorMsg += 'Remember: group is users, which includes alex and sam. Morgan is the owner and also has access. ';
        }
      } else if (currentRound === 2) {
        const isShadowSelected = selectedSuspects.includes('shadow');
        const isAlexSelected = selectedSuspects.includes('alex');
        const isMorganSelected = selectedSuspects.includes('morgan');
        if (isShadowSelected || isAlexSelected || isMorganSelected) {
          errorMsg += 'Note that even though shadow is in group admins, the group permissions are completely empty (---), denying all group access. ';
        } else {
          errorMsg += 'Only the file owner (sam) has read/write permissions (-rw-------). ';
        }
      }

      setPhase1Feedback({
        isChecked: true,
        isCorrect: false,
        message: errorMsg + 'Review the permission settings and adjust your selections.'
      });
    }
  };

  const handleRetryPhase1 = () => {
    sound.playClick();
    setPhase1Feedback(null);
    setSelectedSuspects([]);
  };

  const handleNextRound = () => {
    sound.playClick();
    setCurrentRound(prev => prev + 1);
    setSelectedSuspects([]);
    setPhase1Feedback(null);
  };

  const handleProceedToPhase2 = () => {
    sound.playClick();
    setGameState('PHASE_2');
    setLogTerminalLines([
      'security-serverd v4.12 initialized.',
      'establishing secure link to audits audit_secure.log...',
      'READY // Accessing security logs for target file secret.key...',
      '',
      '[2026-06-19T22:10:04] ACCESS REQUEST: secret.key | USER: shadow | RESULT: SUCCESS',
      '[2026-06-19T22:11:42] DECRYPT ATTEMPT: secret.key | USER: shadow | RESULT: KEY_STOLEN',
      '[2026-06-19T22:12:01] LOG FILE SHREDDER STARTED | USER: shadow | RESULT: TERMINATED',
      '',
      'Last accessed by:',
      'shadow'
    ]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logTerminalLines]);

  const handleConfirmThief = () => {
    if (selectedThief === 'shadow') {
      sound.playVictory();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f87171']
      });
      setPhase2Feedback({
        isChecked: true,
        isCorrect: true,
        message: 'BINGO! The audit log confirms shadow accessed and decrypted secret.key just before shredding. Suspect shadow is identified as the Obsidian Infiltrator thief!'
      });
    } else {
      sound.playIncorrect();
      let explanation = '';
      if (selectedThief === 'sam') {
        explanation = 'The logs show sam requested access earlier, but it was denied/idle. Sam is not the thief.';
      } else if (selectedThief === 'alex' || selectedThief === 'morgan') {
        explanation = 'Permissions blocked both alex and morgan from reading the secret.key entirely. They could not have stolen it.';
      }
      setPhase2Feedback({
        isChecked: true,
        isCorrect: false,
        message: `Incorrect accusation. ${explanation} Re-evaluate the files log buffer.`
      });
    }
  };

  const handleRetryPhase2 = () => {
    sound.playClick();
    setSelectedThief(null);
    setPhase2Feedback(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between crt-overlay">
      <TelemetryOverlay />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 px-4">
        <div className="w-full max-w-md text-center select-none pt-2 pb-4 font-mono">
          <div className="text-[11px] text-red-500/50 font-bold tracking-[0.25em] uppercase">
            PROJECT SENTINEL
          </div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1">
            FIELD ASSESSMENT 05
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
              B. PHASE 1: PRIVILEGE ANALYSIS
             ========================================== */}
          {gameState === 'PHASE_1' && (() => {
            const activeRound = permissionRounds[currentRound];
            return (
              <motion.div
                key={`phase1-round-${currentRound}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-xl bg-cyber-card/95 border-2 border-red-500 rounded-lg p-5 shadow-[0_0_20px_rgba(239,68,68,0.35)] backdrop-blur-md font-mono select-none"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b border-red-950/60 pb-3">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">CASE FILE ANALYSIS</span>
                    <h3 className="text-slate-100 text-sm font-bold uppercase tracking-wider">
                      PHASE 1 // ACCESS AUTHORIZATION (ROUND {currentRound + 1}/3)
                    </h3>
                  </div>
                  <button onClick={handleToggleMute} className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-red-400 cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
                  </button>
                </div>

                {/* Secure File metadata */}
                <div className="bg-slate-950/80 border border-red-950/50 rounded p-4 mb-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-950/20 border border-dashed border-red-500/30 flex items-center justify-center rounded text-red-400">
                    <FileKey className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">BREACHED NODE OBJECTIVE</span>
                    <div className="text-slate-200 text-sm font-bold font-mono">{activeRound.file}</div>
                    <div className="text-xs text-red-400 font-mono mt-0.5">
                      Permissions: <span className="font-extrabold tracking-wider">{activeRound.permissions}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Owner: <span className="text-slate-200 font-semibold">{activeRound.owner}</span> | Group: <span className="text-slate-200 font-semibold">{activeRound.group}</span>
                    </div>
                  </div>
                </div>

                {/* Scenario briefing Question */}
                <div className="bg-slate-950/40 border border-cyber-border/40 rounded p-4 mb-4 text-xs sm:text-[13px] leading-relaxed text-slate-300">
                  <span className="text-red-400 font-bold block mb-1">INTERACTIVE INSTRUCTION:</span>
                  {activeRound.question}
                </div>

                {/* Suspect listings */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {suspectsList.map((suspect) => {
                    const isChecked = selectedSuspects.includes(suspect.id);
                    const isDisabled = phase1Feedback?.isChecked;
                    return (
                      <div
                        key={suspect.id}
                        onClick={() => !isDisabled && handleToggleSelectSuspect(suspect.id)}
                        className={`border p-3.5 rounded-md flex flex-col justify-between space-y-3 transition-all select-none cursor-pointer ${
                          isChecked
                            ? 'bg-red-950/15 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                            : 'bg-slate-950/60 border-cyber-border hover:border-red-900/60'
                        } ${isDisabled ? 'opacity-80 cursor-default' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${suspect.avatarColor} flex items-center justify-center shadow-md border border-slate-700 text-[11px] font-bold text-slate-100 uppercase`}>
                            {suspect.id === 'alex' ? 'A' : suspect.id === 'sam' ? 'B' : suspect.id === 'morgan' ? 'C' : 'D'}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-slate-200 uppercase">
                              {suspect.id === 'alex' ? 'A) ' : suspect.id === 'sam' ? 'B) ' : suspect.id === 'morgan' ? 'C) ' : 'D) '}
                              {suspect.name}
                            </div>
                            <span className="text-[9px] text-slate-500 tracking-wider">USER PROFILE</span>
                          </div>
                        </div>
                        
                        <div className="bg-slate-950/80 rounded px-2 py-1 border border-cyber-border/30 text-[10px]">
                          <span className="text-slate-500 uppercase block tracking-wider font-bold">Groups:</span>
                          <span className="text-slate-300 font-mono">{suspect.groups.join(', ')}</span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] select-none pt-0.5">
                          <span className="text-slate-500 font-bold uppercase">SELECT AUTHORIZED:</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700'}`}>
                            {isChecked && '✓'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Feedback Alert banner */}
                {phase1Feedback && (
                  <div className="space-y-4 mb-5">
                    <div className={`border p-4 rounded text-xs font-mono flex items-start gap-3 select-text ${phase1Feedback.isCorrect ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-red-950/20 border-red-900 text-red-400'}`}>
                      {phase1Feedback.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 animate-pulse" />
                      )}
                      <div className="leading-relaxed">
                        {phase1Feedback.message}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-red-950/50 rounded p-4 text-xs font-mono">
                      <span className="text-red-400 font-bold block mb-2">⚡ SECURITY INTELLIGENCE BRIEFING: PLAYER LEARNS</span>
                      <div className="space-y-2">
                        <div className="text-slate-200 font-bold tracking-wider font-mono text-sm">{activeRound.permissions}</div>
                        <div className="text-slate-400 text-xs font-sans">means:</div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded border border-cyber-border/40">
                          <div>
                            <span className="text-red-400 font-bold block uppercase text-[9px] tracking-wider">Owner ({activeRound.owner})</span>
                            <span className="text-slate-300">{activeRound.learnBreakdown.owner}</span>
                          </div>
                          <div>
                            <span className="text-red-400 font-bold block uppercase text-[9px] tracking-wider">Group ({activeRound.group})</span>
                            <span className="text-slate-300">{activeRound.learnBreakdown.group}</span>
                          </div>
                          <div>
                            <span className="text-red-400 font-bold block uppercase text-[9px] tracking-wider">Others</span>
                            <span className="text-slate-300">{activeRound.learnBreakdown.others}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-4 pt-1">
                  {!phase1Feedback ? (
                    <button
                      onClick={handleVerifyPhase1}
                      disabled={selectedSuspects.length === 0}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 text-white font-mono font-bold text-xs tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase"
                    >
                      VERIFY PRIVILEGES
                    </button>
                  ) : !phase1Feedback.isCorrect ? (
                    <button
                      onClick={handleRetryPhase1}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs tracking-widest py-3 rounded border border-cyber-border cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      RE-EXAMINE DATA
                    </button>
                  ) : currentRound < 2 ? (
                    <button
                      onClick={handleNextRound}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      PROCEED TO ROUND {currentRound + 2}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleProceedToPhase2}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      ACCESS SECURITY AUDIT LOGS
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })()}

          {/* ==========================================
              C. PHASE 2: AUDIT LOG INVESTIGATION
             ========================================== */}
          {gameState === 'PHASE_2' && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl bg-cyber-card/95 border-2 border-red-500 rounded-lg p-5 shadow-[0_0_20px_rgba(239,68,68,0.35)] backdrop-blur-md font-mono select-none"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 border-b border-red-950/60 pb-3">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">CASE FILE ANALYSIS</span>
                  <h3 className="text-slate-100 text-sm font-bold uppercase tracking-wider">PHASE 2 // AUDIT INTERROGATION</h3>
                </div>
                <button onClick={handleToggleMute} className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-red-400 cursor-pointer">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
                </button>
              </div>

              {/* Instructions Callout */}
              <div className="bg-slate-950/40 border border-cyber-border/40 rounded p-4 mb-4 text-xs leading-relaxed text-slate-300">
                <span className="text-red-400 font-bold block mb-1">INTERACTIVE INSTRUCTION:</span>
                Analyze the decrypted audit logs console below to identify who accessed and stole the decryption key.
              </div>

              {/* Simulated Logs Terminal Console */}
              <div className="bg-slate-950 border border-red-950/60 rounded p-3 text-[11px] font-mono leading-relaxed h-[200px] overflow-y-auto mb-4 scrollbar-thin select-text">
                {logTerminalLines.map((line, idx) => (
                  <div key={idx} className={line.startsWith('agent@') ? 'text-red-400 font-bold' : line.includes('KEY_STOLEN') ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300 whitespace-pre'}>
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef}></div>
              </div>

              {/* Thief selection grid */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950/60 border border-red-900/30 rounded p-4 mb-5"
              >
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-2 select-none">
                  QUESTION: WHO STOLE THE KEY?
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 select-none">
                  {['alex', 'sam', 'morgan', 'shadow'].map((suspectId) => {
                    const isSelected = selectedThief === suspectId;
                    const isDisabled = phase2Feedback?.isCorrect;
                    const prefixMap: Record<string, string> = { alex: 'A) ', sam: 'B) ', morgan: 'C) ', shadow: 'D) ' };
                    return (
                      <button
                        key={suspectId}
                        onClick={() => !isDisabled && setSelectedThief(suspectId)}
                        disabled={isDisabled}
                        className={`border font-bold text-xs py-3 rounded-md transition-all uppercase cursor-pointer ${
                          isSelected
                            ? 'bg-red-950/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                            : 'bg-slate-950 border-cyber-border text-slate-400 hover:border-red-950'
                        } disabled:opacity-85 disabled:cursor-default`}
                      >
                        {prefixMap[suspectId] || ''}{suspectId}
                      </button>
                    );
                  })}
                </div>

                {phase2Feedback && (
                  <div className={`border p-3.5 rounded mt-3 text-xs font-mono flex items-start gap-3 select-text ${phase2Feedback.isCorrect ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-red-950/20 border-red-900 text-red-400'}`}>
                    {phase2Feedback.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                    )}
                    <div className="leading-relaxed">
                      {phase2Feedback.message}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Accusation Confirm Buttons */}
              <div className="flex gap-4 pt-1">
                {!phase2Feedback ? (
                  <button
                    onClick={handleConfirmThief}
                    disabled={!selectedThief}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 text-white font-mono font-bold text-xs tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase"
                  >
                    CONFIRM SUSPECT ACCUSATION
                  </button>
                ) : !phase2Feedback.isCorrect ? (
                  <button
                    onClick={handleRetryPhase2}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs tracking-widest py-3 rounded border border-cyber-border cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    RE-EVALUATE CLUES
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameState('WON');
                    }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs tracking-widest py-3 rounded border border-red-500 shadow-md cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    COMPLETE FILE HANDSHAKE
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              className="w-full max-w-lg bg-black border-2 border-red-500 rounded-md p-6 shadow-[0_0_20px_rgba(239,68,68,0.3)] space-y-6 relative"
            >
              <div className="text-center border-b border-red-950 pb-3">
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">HANDSHAKE COMPLETE</span>
                <h2 className="text-slate-100 text-xl font-extrabold uppercase mt-0.5 text-glow-red">
                  CASE CLOSED
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-red-950/20 border border-red-900/30 rounded p-4 text-xs font-mono text-red-400">
                  <CheckCircle2 className="w-8 h-8 text-red-500 shrink-0" />
                  <div className="leading-relaxed">
                    Obsidian's encryption key thief successfully neutralized. Identified as <span className="text-white font-bold underline">shadow</span>. Audit logs locked down and secure.
                  </div>
                </div>

                {/* Case parameters check log */}
                <div className="flex flex-col gap-1 select-none">
                  <span className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider">TRAVERSED EVIDENCE FILE:</span>
                  <div className="bg-slate-950 border border-red-950 rounded p-3 text-[10px] text-slate-400 space-y-1">
                    <div>$ permissions check secret.key</div>
                    <div className="text-slate-500 pr-1 pl-3">• -rw-r-----: Owner reads (shadow), Group reads (admins include sam)</div>
                    <div>$ run secure_audit log grep "secret.key"</div>
                    <div className="text-slate-500 pr-1 pl-3">• Last accessed record confirms user "shadow" took secret.key</div>
                    <div className="text-red-400 font-bold">• Case verification: shadow = Infiltrator</div>
                  </div>
                </div>

                {/* Educational summary */}
                <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-300 text-left font-sans border border-red-900/20">
                  <span className="text-red-400 font-bold font-mono block mb-1">🛡️ SUMMARY LOG:</span>
                  You successfully verified UNIX authorization blocks:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono text-[11px] text-slate-400">
                    <li>Owner shadow (rw-) can read/write</li>
                    <li>Group admins members like sam (r--) can read</li>
                    <li>Others (alex, morgan) are locked out (---)</li>
                    <li>Audit traces pinned actual decryption access to shadow</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 pt-2 select-none">
                <button
                  onClick={handleStartMission}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-200 font-bold text-xs py-3 px-3 rounded border border-red-950 hover:border-red-500/50 cursor-pointer flex items-center justify-center gap-1.5 font-mono"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RE-OPEN DOSSIER
                </button>
                
                <button
                  onClick={() => {
                    sound.playClick();
                    alert('CLASSIFIED: Access Portal secure. Proceed gate locked.');
                  }}
                  className="flex-1 bg-red-950 hover:bg-red-900 text-red-400 font-bold text-xs py-3 px-3 rounded border-2 border-red-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-950/30 hover:shadow-red-500/20 transition-all animate-pulse font-mono"
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
        SECURE TRAINING CORE // WHO STOLE THE KEY ACTIVE
      </footer>
    </div>
  );
};

export default Modul5Game;
