import { useState, useEffect, useCallback, useRef } from 'react';
import './index9game.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Cpu, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

/* ─── Data ──────────────────────────────────────────────── */

interface Gate {
  id: number;
  progress: number;
  question: string;
  reason: string;
  correctLane: number;          // 0-4
  status: 'INCOMING' | 'PASSED' | 'CRASHED';
}

/** The 5 fixed lane labels — these never change */
const LANES = ['TCP', 'UDP', 'L7 App', 'L3 Net', 'L2 Link'] as const;

const QUESTIONS: { q: string; ans: string; reason: string }[] = [
  { q: "File Download",     ans: "TCP",     reason: "File downloads need TCP because every byte must arrive reliably." },
  { q: "Live Video",        ans: "UDP",     reason: "Live video uses UDP — speed matters more than perfect delivery." },
  { q: "Email (SMTP)",      ans: "TCP",     reason: "Email requires TCP to ensure the full message is delivered intact." },
  { q: "Online Gaming",     ans: "UDP",     reason: "Gaming uses UDP for low-latency, real-time data transmission." },
  { q: "IP Address",        ans: "L3 Net",  reason: "IP addresses operate at Layer 3 (Network) for routing between networks." },
  { q: "MAC Address",       ans: "L2 Link", reason: "MAC addresses work at Layer 2 (Data Link) for local network delivery." },
  { q: "Web Browser",       ans: "L7 App",  reason: "Web browsers operate at Layer 7 (Application) — the user-facing layer." },
  { q: "Reliable Transfer", ans: "TCP",     reason: "TCP guarantees delivery with checksums, ordering, and retransmission." },
  { q: "Voice Chat",        ans: "UDP",     reason: "Voice chat uses UDP — a dropped packet is better than a delayed one." },
  { q: "Routing Packets",   ans: "L3 Net",  reason: "Routing happens at Layer 3 (Network) using IP addresses." },
  { q: "DNS Lookup",        ans: "UDP",     reason: "DNS uses UDP for fast, lightweight queries (small single packets)." },
  { q: "SSH Terminal",      ans: "TCP",     reason: "SSH needs TCP — every command and response must arrive reliably." },
];

/* ─── Sound ─────────────────────────────────────────────── */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean;
  constructor() { this.isMuted = localStorage.getItem('sentinel_sound_muted') === 'true'; }
  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  setMute(m: boolean) { this.isMuted = m; localStorage.setItem('sentinel_sound_muted', m ? 'true' : 'false'); }
  getMuted() { return this.isMuted; }

  playClick() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(500, c.currentTime); o.frequency.exponentialRampToValueAtTime(250, c.currentTime + 0.04); g.gain.setValueAtTime(0.015, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.04); } catch {}
  }
  playMove() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(300, c.currentTime); o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.06); g.gain.setValueAtTime(0.02, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.06); } catch {}
  }
  playSuccess() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(440, c.currentTime); o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.08); g.gain.setValueAtTime(0.04, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.12); } catch {}
  }
  playError() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, c.currentTime); o.frequency.linearRampToValueAtTime(60, c.currentTime + 0.35); g.gain.setValueAtTime(0.08, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.35); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35); } catch {}
  }
  playWin() {
    if (this.isMuted) return;
    try { const c = this.init(), now = c.currentTime; [349.23, 440, 523.25, 659.25].forEach((f, i) => { const t = now + i * 0.12; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.35); }); } catch {}
  }
  playEngine() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, c.currentTime); g.gain.setValueAtTime(0.008, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5); } catch {}
  }
}

const sound = new SoundManager();

function spawnGate(id: number): Gate {
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const correctLane = LANES.indexOf(q.ans as typeof LANES[number]);
  return { id, progress: 0, question: q.q, reason: q.reason, correctLane, status: 'INCOMING' };
}

/* ── 3-D projection: maps gate.progress (0-100) → screen coords ── */

function projectGate(progress: number, viewportW: number, viewportH: number) {
  // Vanishing point
  const vpX = viewportW / 2;
  const vpY = viewportH * 0.35;              // horizon at 35%

  // t goes from 0 (horizon) to 1 (camera)
  const t = Math.pow(progress / 100, 1.6);   // power curve for depth

  const y = vpY + t * (viewportH - vpY);      // vertical position
  const scale = 0.08 + t * 1.4;               // size scaling
  const opacity = progress < 4 ? progress / 4 : 1;

  return { x: vpX, y, scale, opacity };
}

/* ─── Component ─────────────────────────────────────────── */

const WIN_SCORE = 8;
const HIT_ZONE = 82;   // progress value where collision is checked

export default function Modul9Game() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WON' | 'GAMEOVER'>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [lane, setLane] = useState(2);          // 0-4 (start in center)
  const [gates, setGates] = useState<Gate[]>([]);
  const [flashType, setFlashType] = useState<'none' | 'crash' | 'pass'>('none');
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [pauseTimer, setPauseTimer] = useState(0);
  const nextId = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  /* ── Controls ── */
  const steerLeft  = useCallback(() => { setLane(l => { if (l > 0) sound.playMove(); return Math.max(0, l - 1); }); }, []);
  const steerRight = useCallback(() => { setLane(l => { if (l < 4) sound.playMove(); return Math.min(4, l + 1); }); }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (pauseReason) return; // Block input during pause
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steerLeft();
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steerRight();
  }, [steerLeft, steerRight, pauseReason]);

  useEffect(() => { window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey); }, [handleKey]);

  /* ── Start / Restart ── */
  const startGame = () => {
    sound.playClick();
    nextId.current = 1;
    setScore(0);
    setLives(3);
    setLane(2);
    setGates([spawnGate(0)]);
    setFlashType('none');
    setPauseReason(null);
    setPauseTimer(0);
    setGameState('PLAYING');
  };

  /* ── Main game tick (setInterval – avoids RAF stale-closure issues) ── */
  useEffect(() => {
    if (gameState !== 'PLAYING' || pauseReason) return;

    const TICK = 33; // ~30fps
    const interval = setInterval(() => {
      setGates(prev => {
        let arr = prev.map(g => g.status === 'INCOMING' ? { ...g, progress: g.progress + 0.23 } : { ...g, progress: g.progress + 0.58 });

        // Check collisions
        arr = arr.map(g => {
          if (g.status !== 'INCOMING') return g;
          if (g.progress >= HIT_ZONE && g.progress - 0.23 < HIT_ZONE) {
            // This gate just crossed the hit zone THIS tick
            setLane(currentLane => {
              if (currentLane === g.correctLane) {
                sound.playSuccess();
                setScore(s => s + 1);
                setFlashType('pass');
                setTimeout(() => setFlashType('none'), 400);
                g = { ...g, status: 'PASSED' };
              } else {
                sound.playError();
                setLives(l => l - 1);
                setFlashType('crash');
                setTimeout(() => setFlashType('none'), 500);
                const correctAns = LANES[g.correctLane];
                setPauseReason(`"${g.question}" → ${correctAns}. ${g.reason}`);
                setPauseTimer(5);
                g = { ...g, status: 'CRASHED' };
              }
              return currentLane;
            });
          }
          return g;
        });

        // Remove off-screen gates
        arr = arr.filter(g => g.progress < 130);

        // Spawn next gate when the last one is far enough
        const last = arr[arr.length - 1];
        if (!last || last.progress > 55) {
          arr.push(spawnGate(nextId.current++));
        }

        return arr;
      });

      // Low engine hum every 500ms
      sound.playEngine();
    }, TICK);

    return () => clearInterval(interval);
  }, [gameState, pauseReason]);

  /* ── Pause countdown ── */
  useEffect(() => {
    if (!pauseReason || pauseTimer <= 0) return;
    const t = setInterval(() => {
      setPauseTimer(prev => {
        if (prev <= 1) {
          setPauseReason(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pauseReason, pauseTimer]);

  /* ── Win / Loss ── */
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    if (score >= WIN_SCORE) {
      sound.playWin();
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 }, colors: ['#a855f7', '#c084fc', '#7c3aed'] });
      setGameState('WON');
    } else if (lives <= 0) {
      setGameState('GAMEOVER');
    }
  }, [score, lives, gameState]);

  /* ── Current question (from the closest incoming gate) ── */
  const currentGate = gates.find(g => g.status === 'INCOMING');

  /* ── Viewport dimensions for projection ── */
  const vw = viewportRef.current?.clientWidth ?? 700;
  const vh = viewportRef.current?.clientHeight ?? 500;

  return (
    <div className="relative min-h-[580px] w-full max-w-6xl bg-cyber-bg border-2 border-purple-500/40 rounded-xl p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(168,85,247,0.15)] select-none overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4 z-50">
        <span className="text-xs uppercase tracking-[0.25em] text-purple-400/70 font-bold font-mono">
          Room 09 &bull; Packet Highway
        </span>
        <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-1.5 rounded-lg hover:bg-purple-500/10 transition cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-purple-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col z-10">
        <AnimatePresence mode="wait">
          {(gameState === 'START' || gameState === 'PLAYING') && (
            <motion.div key="game" className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* ── Left Panel: Knowledge ── */}
              <div className="xl:col-span-3 flex flex-col overflow-y-auto max-h-[520px] custom-scrollbar z-50">
                <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 text-slate-300 space-y-4 text-sm font-sans flex-1">
                  <h2 className="text-purple-400 font-bold text-base uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_6px_#a855f7]"></span>
                    Protocol Routing
                  </h2>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Steer your data packet into the correct protocol lane. Each gate shows a data type — match it to the right protocol to pass safely.
                  </p>

                  <div className="space-y-2">
                    <h3 className="text-purple-300/80 font-bold text-[11px] uppercase tracking-widest border-b border-purple-900/40 pb-1">Protocols</h3>
                    <div className="bg-[#0a0318] border border-blue-900/30 p-2.5 rounded-lg">
                      <strong className="text-blue-400 text-xs">TCP — Reliable</strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">File downloads, Email, SSH, Web</p>
                    </div>
                    <div className="bg-[#0a0318] border border-emerald-900/30 p-2.5 rounded-lg">
                      <strong className="text-emerald-400 text-xs">UDP — Fast</strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">Video Streaming, Gaming, Voice, DNS</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-purple-300/80 font-bold text-[11px] uppercase tracking-widest border-b border-purple-900/40 pb-1">OSI Layers</h3>
                    <div className="text-[11px] space-y-1.5 text-slate-400">
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span><strong className="text-purple-300">L7 App</strong> — Browser, Email clients</div>
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span><strong className="text-emerald-300">L3 Network</strong> — IP Addresses, Routing</div>
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span><strong className="text-orange-300">L2 Data Link</strong> — MAC Addresses</div>
                    </div>
                  </div>

                  <div className="bg-purple-950/20 border border-purple-500/20 p-3 rounded-lg text-[11px] text-purple-300/80 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-purple-400 block">Controls</span>
                    <span>← → Arrow keys or click the steering buttons</span>
                  </div>

                  {gameState === 'START' && (
                    <button onClick={startGame} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] mt-4 cursor-pointer" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>
                      Start Engine
                    </button>
                  )}
                </div>
              </div>

              {/* ── Right Panel: 3D Road Viewport ── */}
              <div ref={viewportRef} className="xl:col-span-9 relative rounded-xl overflow-hidden border border-cyber-border h-[520px]">
                <div className="racer-viewport">
                  {/* Sky & stars */}
                  <div className="racer-stars"></div>

                  {/* City silhouette on horizon */}
                  <div className="racer-city"></div>

                  {/* Horizon glow */}
                  <div className="racer-horizon"></div>

                  {/* Road surface */}
                  <div className="racer-road"></div>                  {/* Lane dividers (dashed lines in perspective) */}
                  <div className="racer-lane-line racer-lane-line--1"></div>
                  <div className="racer-lane-line racer-lane-line--2"></div>
                  <div className="racer-lane-line racer-lane-line--3"></div>
                  <div className="racer-lane-line racer-lane-line--4"></div>

                  {/* Active lane highlight glow */}
                  {gameState === 'PLAYING' && (
                    <div className="racer-active-lane" data-lane={lane}></div>
                  )}

                  {/* Speed lines */}
                  {gameState === 'PLAYING' && <div className="racer-speed-lines"></div>}

                  {/* ── Gates (projected into 3D space) ── */}
                  {gates.map(gate => {
                    const proj = projectGate(gate.progress, vw, vh);
                    if (proj.opacity <= 0) return null;

                    // Compute lane X offset from center
                    const laneOffset = (gate.correctLane - 2); // -2,-1,0,1,2 for 5 lanes
                    // The lateral spread increases as gate gets closer (perspective)
                    const spread = proj.scale * 90;
                    const gateX = proj.x + laneOffset * spread;

                    return (
                      <div
                        key={gate.id}
                        className="racer-gate"
                        style={{
                          left: gateX,
                          top: proj.y,
                          transform: `translate(-50%, -100%) scale(${proj.scale})`,
                          opacity: proj.opacity,
                          zIndex: Math.floor(proj.y),
                        }}
                      >
                        <div className={`racer-gate-banner ${gate.status === 'PASSED' ? 'passed' : gate.status === 'CRASHED' ? 'crashed' : ''}`}>
                          {gate.question}
                        </div>
                      </div>
                    );
                  })}

                  <div className="racer-lane-labels">
                    {LANES.map((label, idx) => (
                      <div key={idx} className={`racer-lane-label ${idx === lane ? 'active' : ''}`}>
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* ── Steering buttons ── */}
                  {gameState === 'PLAYING' && (
                    <>
                      <button className="racer-steer-btn racer-steer-left" onClick={steerLeft}><ChevronLeft className="w-6 h-6" /></button>
                      <button className="racer-steer-btn racer-steer-right" onClick={steerRight}><ChevronRight className="w-6 h-6" /></button>
                    </>
                  )}

                  {/* ── HUD ── */}
                  <div className="racer-hud">
                    <div className="racer-hud-item">
                      <span style={{ color: 'rgba(162,88,255,0.5)', fontSize: 10, letterSpacing: 3 }}>SCORE</span>
                      <span style={{ color: '#c084fc', fontWeight: 800 }}>{score}<span style={{ color: 'rgba(162,88,255,0.4)' }}>/{WIN_SCORE}</span></span>
                    </div>
                    <div className="racer-hud-item" style={{ gap: 6 }}>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: i < lives ? '#ef4444' : '#1e1b2e',
                          border: `2px solid ${i < lives ? '#f87171' : '#2d2640'}`,
                          boxShadow: i < lives ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                        }}></div>
                      ))}
                    </div>
                  </div>

                  {/* ── Current question prompt ── */}
                  {currentGate && gameState === 'PLAYING' && (
                    <div className="racer-question-prompt">
                      Route: <span style={{ color: '#c084fc' }}>{currentGate.question}</span>
                    </div>
                  )}

                  {/* ── Flash effects ── */}
                  {flashType === 'crash' && <div className="racer-crash-flash"></div>}
                  {flashType === 'pass' && <div className="racer-success-flash"></div>}

                  {/* ── Pause overlay (wrong answer explanation) ── */}
                  {pauseReason && (
                    <div className="racer-pause-overlay">
                      <div className="racer-pause-reason">
                        <strong>Wrong lane!</strong><br />{pauseReason}
                      </div>
                      <div className="racer-pause-timer">Resuming in {pauseTimer}s</div>
                    </div>
                  )}

                  {/* ── Start overlay ── */}
                  {gameState === 'START' && (
                    <div className="racer-start-overlay">
                      <div className="racer-start-title">Packet Highway</div>
                      <div className="racer-start-subtitle">Route data through the correct protocol lanes</div>
                      <button onClick={startGame} className="racer-start-btn">Ignite</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Game Over ── */}
          {gameState === 'GAMEOVER' && (
            <motion.div key="over" className="w-full max-w-md mx-auto mt-16 relative z-50 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-cyber-card border-2 border-red-500/40 rounded-xl p-8 shadow-[0_0_40px_rgba(239,68,68,0.15)] space-y-5">
                <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold text-white uppercase tracking-[0.3em]" style={{ fontFamily: "'Orbitron', sans-serif" }}>System Crash</h2>
                <p className="text-sm text-red-300/70 font-sans">Too many packets were mis-routed. The network went down.</p>
                <p className="text-xs text-slate-500">Score: {score}/{WIN_SCORE}</p>
                <button onClick={startGame} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold uppercase tracking-widest transition-all cursor-pointer" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>
                  Reboot
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Win ── */}
          {gameState === 'WON' && (
            <motion.div key="won" className="w-full max-w-md mx-auto mt-16 relative z-50 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-cyber-card border-2 border-purple-500/40 rounded-xl p-8 shadow-[0_0_40px_rgba(168,85,247,0.2)] space-y-5">
                <Cpu className="w-14 h-14 text-purple-400 mx-auto animate-pulse" />
                <h2 className="text-xl font-bold text-white uppercase tracking-[0.3em]" style={{ fontFamily: "'Orbitron', sans-serif" }}>Transmission Secure</h2>
                <p className="text-sm text-slate-400 font-sans leading-relaxed">Every packet was routed through the correct protocol. The data reached its destination safely.</p>
                <button
                  onClick={() => { sound.playClick(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold uppercase tracking-widest cursor-pointer transition-all" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}
                >
                  Return to Hub
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
