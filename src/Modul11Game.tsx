import { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, VolumeX, ShieldAlert, Radar } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index11game.css';

/* ─── Types ─────────────────────────────────────────────── */

type GamePhase = 'START' | 'SCANNING' | 'CALLING' | 'ROTATING' | 'WON' | 'LOST';
type ScanMode = 'BASIC' | 'SV' | 'SC_SV' | null;

interface PortInfo {
  port: number;
  state: 'open' | 'closed';
  service: string;
  version: string;
  scriptData: string;
  isVulnerable: boolean;
  // Revealed layers
  stateRevealed: boolean;
  serviceRevealed: boolean;
  versionRevealed: boolean;
  scriptRevealed: boolean;
  isStale: boolean;
}

interface Scenario {
  targetName: string;
  targetIP: string;
  ports: Omit<PortInfo, 'stateRevealed' | 'serviceRevealed' | 'versionRevealed' | 'scriptRevealed' | 'isStale'>[];
  rotatedPorts: Omit<PortInfo, 'stateRevealed' | 'serviceRevealed' | 'versionRevealed' | 'scriptRevealed' | 'isStale'>[];
}

/* ─── Scenarios ─────────────────────────────────────────── */

const SCENARIOS: Scenario[] = [
  {
    targetName: 'Obsidian Web Cluster',
    targetIP: '203.0.113.25',
    ports: [
      { port: 22,   state: 'open',   service: 'ssh',   version: 'OpenSSH 9.2',       scriptData: 'ssh-hostkey: RSA 3072', isVulnerable: false },
      { port: 80,   state: 'open',   service: 'http',  version: 'Apache 2.2.8',       scriptData: 'http-title: Legacy Admin', isVulnerable: true },
      { port: 443,  state: 'open',   service: 'https', version: 'Apache 2.4.57',      scriptData: 'ssl-cert: obsidian.local', isVulnerable: false },
      { port: 3306, state: 'open',   service: 'mysql', version: 'MySQL 8.0',          scriptData: 'mysql-info: Community Ed.', isVulnerable: false },
      { port: 25,   state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 3389, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
    ],
    rotatedPorts: [
      { port: 22,   state: 'open',   service: 'ssh',   version: 'OpenSSH 9.2',       scriptData: 'ssh-hostkey: RSA 3072', isVulnerable: false },
      { port: 80,   state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 443,  state: 'open',   service: 'https', version: 'Apache 2.4.57',      scriptData: 'ssl-cert: obsidian.local', isVulnerable: false },
      { port: 3306, state: 'open',   service: 'mysql', version: 'MySQL 8.0',          scriptData: 'mysql-info: Community Ed.', isVulnerable: false },
      { port: 8443, state: 'open',   service: 'http',  version: 'Apache 2.2.8',       scriptData: 'http-title: Legacy Admin', isVulnerable: true },
      { port: 3389, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
    ],
  },
  {
    targetName: 'Sentinel Auth Node',
    targetIP: '10.10.14.8',
    ports: [
      { port: 22,   state: 'open',   service: 'ssh',   version: 'OpenSSH 7.2',       scriptData: 'ssh-hostkey: RSA 2048', isVulnerable: true },
      { port: 80,   state: 'open',   service: 'http',  version: 'Nginx 1.24',         scriptData: 'http-title: Auth Portal', isVulnerable: false },
      { port: 443,  state: 'open',   service: 'https', version: 'Nginx 1.24',         scriptData: 'ssl-cert: sentinel.io', isVulnerable: false },
      { port: 53,   state: 'open',   service: 'dns',   version: 'dnsmasq 2.89',       scriptData: 'dns-nsid: sentinel-dns', isVulnerable: false },
      { port: 3306, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 8080, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
    ],
    rotatedPorts: [
      { port: 22,   state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 80,   state: 'open',   service: 'http',  version: 'Nginx 1.24',         scriptData: 'http-title: Auth Portal', isVulnerable: false },
      { port: 443,  state: 'open',   service: 'https', version: 'Nginx 1.24',         scriptData: 'ssl-cert: sentinel.io', isVulnerable: false },
      { port: 53,   state: 'open',   service: 'dns',   version: 'dnsmasq 2.89',       scriptData: 'dns-nsid: sentinel-dns', isVulnerable: false },
      { port: 2222, state: 'open',   service: 'ssh',   version: 'OpenSSH 7.2',        scriptData: 'ssh-hostkey: RSA 2048', isVulnerable: true },
      { port: 8080, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
    ],
  },
  {
    targetName: 'Obsidian DB Vault',
    targetIP: '192.168.1.50',
    ports: [
      { port: 22,   state: 'open',   service: 'ssh',   version: 'OpenSSH 9.2',       scriptData: 'ssh-hostkey: ED25519', isVulnerable: false },
      { port: 80,   state: 'open',   service: 'http',  version: 'Apache 2.4.57',      scriptData: 'http-title: DB Console', isVulnerable: false },
      { port: 443,  state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 3306, state: 'open',   service: 'mysql', version: 'MySQL 5.1.73',       scriptData: 'mysql-info: Legacy Build', isVulnerable: true },
      { port: 25,   state: 'open',   service: 'smtp',  version: 'Postfix 3.7',        scriptData: 'smtp-commands: EHLO', isVulnerable: false },
      { port: 8080, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
    ],
    rotatedPorts: [
      { port: 22,   state: 'open',   service: 'ssh',   version: 'OpenSSH 9.2',       scriptData: 'ssh-hostkey: ED25519', isVulnerable: false },
      { port: 80,   state: 'open',   service: 'http',  version: 'Apache 2.4.57',      scriptData: 'http-title: DB Console', isVulnerable: false },
      { port: 443,  state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 3306, state: 'closed', service: '—',     version: '—',                  scriptData: '—', isVulnerable: false },
      { port: 25,   state: 'open',   service: 'smtp',  version: 'Postfix 3.7',        scriptData: 'smtp-commands: EHLO', isVulnerable: false },
      { port: 33060,state: 'open',   service: 'mysql', version: 'MySQL 5.1.73',       scriptData: 'mysql-info: Legacy Build', isVulnerable: true },
    ],
  },
];

const SCAN_COSTS = { BASIC: { tokens: 1, noise: 8 }, SV: { tokens: 2, noise: 18 }, SC_SV: { tokens: 3, noise: 32 } };
const NOISE_THRESHOLD = 65;
const STARTING_TOKENS = 10;

/* ─── Sound Manager ─────────────────────────────────────── */

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

  playScan() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(600, c.currentTime); o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.15); g.gain.setValueAtTime(0.03, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2); } catch {}
  }
  playAlert() {
    if (this.isMuted) return;
    try { const c = this.init(); [400, 300, 400, 300].forEach((f, i) => { const t = c.currentTime + i * 0.15; const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.12); }); } catch {}
  }
  playCorrect() {
    if (this.isMuted) return;
    try { const c = this.init(), now = c.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const t = now + i * 0.1; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.25); }); } catch {}
  }
  playWrong() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, c.currentTime); o.frequency.linearRampToValueAtTime(80, c.currentTime + 0.3); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.3); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3); } catch {}
  }
}

const sound = new SoundManager();

function initPorts(scenario: Scenario): PortInfo[] {
  return scenario.ports.map(p => ({ ...p, stateRevealed: false, serviceRevealed: false, versionRevealed: false, scriptRevealed: false, isStale: false }));
}

function getStealthRating(noise: number, tokensUsed: number): { grade: string; className: string } {
  const score = noise + tokensUsed * 3;
  if (score <= 25) return { grade: 'S', className: 'm11-rating-s' };
  if (score <= 40) return { grade: 'A', className: 'm11-rating-a' };
  if (score <= 55) return { grade: 'B', className: 'm11-rating-b' };
  if (score <= 75) return { grade: 'C', className: 'm11-rating-c' };
  return { grade: 'F', className: 'm11-rating-f' };
}

/* ─── Component ─────────────────────────────────────────── */

export default function Modul11Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [noise, setNoise] = useState(0);
  const [tokens, setTokens] = useState(STARTING_TOKENS);
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [scanningPort, setScanningPort] = useState<number | null>(null);
  const [hasRotated, setHasRotated] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);

  const scenario = SCENARIOS[scenarioIndex];

  const hasRotatedRef = useRef(false);

  useEffect(() => {
    hasRotatedRef.current = hasRotated;
  }, [hasRotated]);

  useEffect(() => {
    if (noise >= NOISE_THRESHOLD && !hasRotatedRef.current) {
      triggerRotation();
    }
  }, [noise]);

  const startGame = useCallback(() => {
    const idx = Math.floor(Math.random() * SCENARIOS.length);
    setScenarioIndex(idx);
    setPorts(initPorts(SCENARIOS[idx]));
    setNoise(0);
    setTokens(STARTING_TOKENS);
    setScanMode(null);
    setScanningPort(null);
    setHasRotated(false);
    setTokensUsed(0);
    setPhase('SCANNING');
  }, []);

  const handlePortClick = (index: number) => {
    if (phase === 'CALLING') {
      // In calling mode, check if user clicked the vulnerable port
      const clicked = ports[index];
      if (clicked.isVulnerable && clicked.state === 'open') {
        sound.playCorrect();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#9ece6a', '#7aa2f7', '#ffffff'] });
        setPhase('WON');
      } else {
        sound.playWrong();
        setPhase('LOST');
      }
      return;
    }

    if (phase !== 'SCANNING' || !scanMode) return;

    const cost = SCAN_COSTS[scanMode];
    if (tokens < cost.tokens) return;

    const port = ports[index];

    // Don't rescan if already at this level
    if (scanMode === 'BASIC' && port.stateRevealed && !port.isStale) return;
    if (scanMode === 'SV' && port.versionRevealed && !port.isStale) return;
    if (scanMode === 'SC_SV' && port.scriptRevealed && !port.isStale) return;

    sound.playScan();
    setScanningPort(index);
    setTokens(t => t - cost.tokens);
    setTokensUsed(u => u + cost.tokens);
    const newNoise = noise + cost.noise;
    setNoise(newNoise);

    // Reveal info after scan animation
    setTimeout(() => {
      setScanningPort(null);
      setPorts(prev => {
        const updated = [...prev];
        const p = { ...updated[index], isStale: false };

        if (scanMode === 'BASIC') {
          p.stateRevealed = true;
        } else if (scanMode === 'SV') {
          p.stateRevealed = true;
          p.serviceRevealed = true;
          p.versionRevealed = true;
        } else if (scanMode === 'SC_SV') {
          p.stateRevealed = true;
          p.serviceRevealed = true;
          p.versionRevealed = true;
          p.scriptRevealed = true;
        }

        updated[index] = p;
        return updated;
      });
    }, 800);
  };

  const triggerRotation = () => {
    sound.playAlert();
    setHasRotated(true);
    setPhase('ROTATING');

    setTimeout(() => {
      // Apply rotated port config, preserving reveal state where ports haven't changed
      const rotated = SCENARIOS[scenarioIndex].rotatedPorts;
      setPorts(prev => {
        return rotated.map((rp, i) => {
          const old = prev[i];
          const portChanged = old.port !== rp.port || old.state !== rp.state || old.service !== rp.service;

          return {
            ...rp,
            stateRevealed: portChanged ? false : old.stateRevealed,
            serviceRevealed: portChanged ? false : old.serviceRevealed,
            versionRevealed: portChanged ? false : old.versionRevealed,
            scriptRevealed: portChanged ? false : old.scriptRevealed,
            isStale: portChanged && (old.stateRevealed || old.serviceRevealed),
          };
        });
      });

      setTimeout(() => setPhase('SCANNING'), 2000);
    }, 1500);
  };

  const suspicionPct = Math.min((noise / 100) * 100, 100);
  const suspicionLevel = noise < 35 ? 'low' : noise < NOISE_THRESHOLD ? 'med' : 'high';

  const rating = getStealthRating(noise, tokensUsed);

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] select-none m11-container">

      {/* HUD */}
      <div className="m11-hud">
        <div className="m11-hud-title">Recon Ops &bull; Room 11</div>
        <div className="m11-hud-stats">
          {phase !== 'START' && (
            <>
              <div className="m11-tokens">
                {[...Array(STARTING_TOKENS)].map((_, i) => (
                  <div key={i} className={`m11-token-pip ${i >= tokens ? 'm11-token-spent' : ''}`} />
                ))}
              </div>
              <span className="text-[10px] text-[#565f89] font-bold">{tokens} TOKENS</span>
            </>
          )}
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#1e2230] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#3a3f4c]" /> : <Volume2 className="w-4 h-4 text-[#3a3f4c]" />}
          </button>
        </div>
      </div>

      {/* Suspicion Meter */}
      {phase !== 'START' && phase !== 'WON' && phase !== 'LOST' && (
        <div className="m11-suspicion-container">
          <div className="m11-suspicion-label">
            <span>Suspicion</span>
            <span>{noise >= NOISE_THRESHOLD ? '⚠ DETECTED' : suspicionLevel === 'med' ? 'ELEVATED' : 'LOW'}</span>
          </div>
          <div className="m11-suspicion-bar">
            <div
              className={`m11-suspicion-fill m11-suspicion-${suspicionLevel}`}
              style={{ width: `${suspicionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#7aa2f7]/20 to-[#bb9af7]/10 border border-[#7aa2f7]/30 flex items-center justify-center">
            <Radar className="w-10 h-10 text-[#7aa2f7]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Noise Discipline</h2>
          <p className="text-[#a258ff] text-xs uppercase tracking-[0.2em] mb-6">Stealth Reconnaissance Training</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>You have <strong className="text-[#a258ff]">10 scan tokens</strong> to investigate a target server. Every scan generates <strong className="text-[#eab308]">noise</strong>.</p>
            <p>Aggressive scans reveal more intel but push the <strong className="text-[#ef4444]">suspicion meter</strong> higher. Cross the threshold and the target detects you — it will <strong className="text-[#ef4444]">rotate its services</strong>, invalidating your intel.</p>
            <p>Your mission: identify the <strong className="text-white">vulnerable service</strong> while spending as little noise as possible.</p>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#a258ff]/10 border border-[#a258ff]/50 text-[#a258ff] rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff]/20 hover:border-[#a258ff] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Begin Recon
          </button>
        </div>
      )}

      {/* ── MAIN GAME ── */}
      {(phase === 'SCANNING' || phase === 'CALLING' || phase === 'ROTATING') && (
        <div className="flex flex-col lg:flex-row w-full gap-6 z-10 p-2">
          
          {/* Main Play Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Target label */}
            <div className="text-center z-10 py-1 mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Target: </span>
              <span className="text-[12px] text-[#a258ff] font-bold tracking-wider">{scenario.targetName} — {scenario.targetIP}</span>
            </div>

            {/* Port Grid */}
            <div className="m11-port-grid">
              {ports.map((p, i) => (
                <div
                  key={`${p.port}-${i}`}
                  className={`m11-port-node ${p.stateRevealed ? (p.state === 'open' ? 'm11-port-open' : 'm11-port-closed') : ''} ${scanningPort === i ? 'm11-scanning-node' : ''} ${p.isStale ? 'm11-port-stale' : ''} ${phase === 'CALLING' ? 'cursor-crosshair' : ''}`}
                  onClick={() => handlePortClick(i)}
                >
                  {p.isStale && <div className="m11-stale-badge">Stale</div>}

                  {p.stateRevealed ? (
                    <>
                      <div className="m11-port-number">:{p.port}</div>
                      <div className={`m11-port-state ${p.state === 'open' ? 'm11-state-open' : 'm11-state-closed'}`}>
                        {p.state}
                      </div>
                      {p.serviceRevealed && p.state === 'open' && (
                        <div className="m11-port-service">{p.service}</div>
                      )}
                      {p.versionRevealed && p.state === 'open' && (
                        <div className="m11-port-version">{p.version}</div>
                      )}
                      {p.scriptRevealed && p.state === 'open' && (
                        <div className="m11-port-script">{p.scriptData}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="m11-port-number" style={{ color: '#2a2d34' }}>:????</div>
                      <div className="m11-port-unknown">Unknown</div>
                      <div className="m11-port-unknown" style={{ fontSize: '11px' }}>Select a scan mode, then click here</div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="m11-toolbar mt-6">
              {phase === 'SCANNING' && (
                <>
                  <div
                    className={`m11-scan-btn ${scanMode === 'BASIC' ? 'm11-scan-btn-active' : ''} ${tokens < 1 ? 'm11-scan-btn-disabled' : ''}`}
                    onClick={() => setScanMode(scanMode === 'BASIC' ? null : 'BASIC')}
                  >
                    <div className="m11-scan-cmd">nmap</div>
                    <div className="m11-scan-cost">
                      <span>1 token</span>
                      <span>+8 noise</span>
                    </div>
                  </div>
                  <div
                    className={`m11-scan-btn ${scanMode === 'SV' ? 'm11-scan-btn-active' : ''} ${tokens < 2 ? 'm11-scan-btn-disabled' : ''}`}
                    onClick={() => setScanMode(scanMode === 'SV' ? null : 'SV')}
                  >
                    <div className="m11-scan-cmd">nmap -sV</div>
                    <div className="m11-scan-cost">
                      <span>2 tokens</span>
                      <span>+18 noise</span>
                    </div>
                  </div>
                  <div
                    className={`m11-scan-btn ${scanMode === 'SC_SV' ? 'm11-scan-btn-active' : ''} ${tokens < 3 ? 'm11-scan-btn-disabled' : ''}`}
                    onClick={() => setScanMode(scanMode === 'SC_SV' ? null : 'SC_SV')}
                  >
                    <div className="m11-scan-cmd">nmap -sC -sV</div>
                    <div className="m11-scan-cost">
                      <span>3 tokens</span>
                      <span>+32 noise</span>
                    </div>
                  </div>
                  <div className="m11-call-btn" onClick={() => { setScanMode(null); setPhase('CALLING'); }}>
                    🎯 Call Target
                  </div>
                </>
              )}
              {phase === 'CALLING' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[#ef4444] text-sm font-bold uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Click the vulnerable service
                  </p>
                  <button className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer transition" onClick={() => setPhase('SCANNING')}>
                    ← Back to scanning
                  </button>
                </div>
              )}
            </div>
            
            {/* Rotation Warning Overlay */}
            {phase === 'ROTATING' && (
              <div className="m11-rotation-overlay">
                <div className="m11-rotation-text">⚠ Target Detected Scanning</div>
                <p className="text-[#ef4444]/70 text-sm mt-3 font-sans">Services rotating — intel may be stale</p>
              </div>
            )}
          </div>

          {/* Vulnerability DB Sidebar */}
          <div className="w-full lg:w-64 bg-[#0d061a] border border-[#23123a] rounded-lg p-5 flex flex-col gap-4 shadow-xl shrink-0">
            <h3 className="text-[#a258ff] font-bold uppercase tracking-widest text-xs border-b border-[#23123a] pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              CVE Database
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cross-reference discovered versions against known exploits to identify the weak link.
            </p>

            <div className="flex flex-col gap-3 mt-2">
              <div className="bg-[#05010e] border border-[#23123a]/50 p-3 rounded">
                <div className="text-[#ef4444] text-[10px] font-bold mb-1">CVE-2017-XXXX</div>
                <div className="text-white text-[12px] font-bold font-sans">Apache 2.2.8</div>
                <div className="text-slate-500 text-[10px] mt-1">Remote Code Execution</div>
              </div>
              
              <div className="bg-[#05010e] border border-[#23123a]/50 p-3 rounded">
                <div className="text-[#eab308] text-[10px] font-bold mb-1">CVE-2018-XXXX</div>
                <div className="text-white text-[12px] font-bold font-sans">OpenSSH 7.2</div>
                <div className="text-slate-500 text-[10px] mt-1">User Enumeration Leak</div>
              </div>

              <div className="bg-[#05010e] border border-[#23123a]/50 p-3 rounded">
                <div className="text-[#ef4444] text-[10px] font-bold mb-1">CVE-2012-2122</div>
                <div className="text-white text-[12px] font-bold font-sans">MySQL 5.1.73</div>
                <div className="text-slate-500 text-[10px] mt-1">Authentication Bypass</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── WON ── */}
      {phase === 'WON' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6">
          <div className={`m11-rating ${rating.className} mb-4`}>{rating.grade}</div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Target Identified</h2>
          <p className="text-[#10b981]/60 text-xs uppercase tracking-[0.2em] mb-6">Stealth Rating: {rating.grade}</p>
          <div className="flex gap-8 mb-8 text-center">
            <div>
              <div className="text-2xl font-bold text-[#eab308]">{noise}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Total Noise</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#a258ff]">{tokensUsed}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Tokens Used</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#ef4444]">{hasRotated ? 'Yes' : 'No'}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Detected</div>
            </div>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            New Target
          </button>
        </div>
      )}

      {/* ── LOST ── */}
      {phase === 'LOST' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-[#ef4444]" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Wrong Target</h2>
          <p className="text-[#ef4444]/60 text-xs uppercase tracking-[0.2em] mb-6">Intelligence Failure</p>
          <p className="text-[#ef4444]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            You flagged the wrong service. In a real engagement, this wastes time and tips off the target. Gather more version data before making the call.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#ef4444]/10 border border-[#ef4444]/50 text-[#ef4444] rounded-lg font-bold uppercase tracking-widest hover:bg-[#ef4444]/20 transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
