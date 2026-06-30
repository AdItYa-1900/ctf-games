import { useState } from 'react';
import { Volume2, VolumeX, Server, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index10game.css';

/* ─── Data & Types ──────────────────────────────────────── */

type Phase = 'START' | 'PLAYING' | 'WON' | 'GAMEOVER';

interface ServerNode {
  id: string;
  label: string;
  port: number;
}

const RACK_SERVERS: ServerNode[] = [
  { id: 'blade-01', label: 'HTTP WEB',       port: 80 },
  { id: 'blade-02', label: 'SECURE SHELL',   port: 22 },
  { id: 'blade-03', label: 'FILE TRANSFER',  port: 21 },
  { id: 'blade-04', label: 'HTTPS SECURE',   port: 443 },
  { id: 'blade-05', label: 'MYSQL DB',       port: 3306 },
  { id: 'blade-06', label: 'DNS RESOLVER',   port: 53 },
  { id: 'blade-07', label: 'SMTP MAIL',      port: 25 },
  { id: 'blade-08', label: 'REMOTE DESK',    port: 3389 },
];

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

  playClick() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(300, c.currentTime); g.gain.setValueAtTime(0.01, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.05); } catch {}
  }
  playError() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, c.currentTime); o.frequency.linearRampToValueAtTime(90, c.currentTime + 0.2); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.2); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2); } catch {}
  }
  playPowerOn() {
    if (this.isMuted) return;
    try {
      const c = this.init();
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(880, c.currentTime); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
      const fan = c.createOscillator(), fanG = c.createGain(); fan.type = 'triangle'; fan.frequency.setValueAtTime(50, c.currentTime); fan.frequency.linearRampToValueAtTime(150, c.currentTime + 0.5); fanG.gain.setValueAtTime(0.02, c.currentTime); fanG.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.8); fan.connect(fanG); fanG.connect(c.destination); fan.start(); fan.stop(c.currentTime + 0.8);
    } catch {}
  }
  playWin() {
    if (this.isMuted) return;
    try { const c = this.init(), now = c.currentTime; [440, 554.37, 659.25, 880].forEach((f, i) => { const t = now + i * 0.15; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4); }); } catch {}
  }
}

const sound = new SoundManager();

/* ─── Component ─────────────────────────────────────────── */

export default function Modul10Game() {
  const [phase, setPhase] = useState<Phase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const [requestQueue, setRequestQueue] = useState<ServerNode[]>([]);
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);
  const [poweredBlades, setPoweredBlades] = useState<Set<number>>(new Set());
  const [errorBlade, setErrorBlade] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);

  const startGame = () => {
    sound.playPowerOn();
    const shuffled = [...RACK_SERVERS].sort(() => Math.random() - 0.5);
    setRequestQueue(shuffled);
    setActiveRequestIndex(0);
    setPoweredBlades(new Set());
    setErrorBlade(null);
    setStrikes(0);
    setPhase('PLAYING');
  };

  const handleBladeClick = (index: number) => {
    if (phase !== 'PLAYING') return;
    if (poweredBlades.has(index)) return;

    const activeRequest = requestQueue[activeRequestIndex];
    const clickedBlade = RACK_SERVERS[index];

    if (clickedBlade.port === activeRequest.port) {
      sound.playPowerOn();
      setPoweredBlades(prev => new Set(prev).add(index));

      if (activeRequestIndex + 1 < requestQueue.length) {
        setActiveRequestIndex(i => i + 1);
      } else {
        setTimeout(() => {
          sound.playWin();
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 }, colors: ['#10b981', '#a258ff', '#ffffff'] });
          setPhase('WON');
        }, 500);
      }
    } else {
      sound.playError();
      setErrorBlade(index);
      setStrikes(s => s + 1);

      if (strikes + 1 >= 3) {
        setTimeout(() => setPhase('GAMEOVER'), 500);
      } else {
        setTimeout(() => setErrorBlade(null), 800);
      }
    }
  };

  const activeRequest = requestQueue[activeRequestIndex];
  const progressPercent = (poweredBlades.size / RACK_SERVERS.length) * 100;

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] select-none m10-game-container">

      {/* Ambient floating dust particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`p-${i}`}
          className="m10-particle"
          style={{
            left: `${8 + Math.random() * 84}%`,
            bottom: `${Math.random() * 30}%`,
            animationDuration: `${6 + Math.random() * 8}s`,
            animationDelay: `${Math.random() * 5}s`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
          }}
        />
      ))}

      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          NOC Dashboard &bull; Room 10
        </span>
        <div className="flex items-center gap-4 pointer-events-auto">
          {phase === 'PLAYING' && (
            <div className="flex gap-2 items-center mr-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: i < (3 - strikes) ? '#ef4444' : '#1a1a1a',
                  boxShadow: i < (3 - strikes) ? '0 0 6px #ef4444' : 'none',
                }} />
              ))}
            </div>
          )}
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#23123a] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* ── START Overlay ── */}
      {phase === 'START' && (
        <div className="absolute inset-0 bg-[#05010e]/95 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-6">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#a258ff]/10 border border-[#10b981]/30 flex items-center justify-center">
            <Server className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Datacenter Setup</h2>
          <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-6">Network Operations Center &bull; Rack Configuration</p>
          <p className="text-slate-300 max-w-lg text-center leading-relaxed mb-8 text-sm">
            Engineer, the new Obsidian Server Rack is online but unconfigured.
            The <span className="text-[#10b981] font-bold">Master Switch</span> is receiving incoming port traffic.
            Route each connection to the correct <span className="text-[#a258ff] font-bold">Blade Server</span> to power up the rack.
            You have <span className="text-[#ef4444] font-bold">3 strikes</span> before the system locks out.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 hover:border-[#10b981] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Initialize Rack
          </button>
        </div>
      )}

      {/* ── The Server Rack ── */}
      <div className="m10-server-rack">

        {/* Master Switch Router */}
        <div className="m10-master-switch">
          <div className="m10-switch-logo">
            SYS<span>ROUTER</span>
          </div>
          <div className="m10-switch-lcd">
            <div className="m10-lcd-label">
              {phase === 'PLAYING' ? 'Route Incoming Traffic' : 'System Status'}
            </div>
            <div className="m10-lcd-data">
              {phase === 'PLAYING' && activeRequest ? `PORT ${activeRequest.port}` : (phase === 'WON' ? 'ALL ONLINE' : 'STANDBY')}
            </div>
          </div>
          <div className="m10-led-array">
            <div className={`m10-led ${phase === 'PLAYING' ? 'm10-led-blue' : 'm10-led-orange'}`} />
            <div className={`m10-led ${strikes > 0 ? 'm10-led-red' : ''}`} />
            <div className={`m10-led ${strikes > 1 ? 'm10-led-red' : ''}`} />
          </div>
        </div>

        <div className="h-1" />

        {/* 8 Blade Servers */}
        {RACK_SERVERS.map((server, index) => {
          const isPowered = poweredBlades.has(index);
          const isError = errorBlade === index;

          return (
            <div
              key={server.id}
              className={`m10-blade-server ${isPowered ? 'm10-blade-powered' : ''}`}
              onClick={() => handleBladeClick(index)}
            >
              {/* Rack Unit Number */}
              <div className="m10-rack-unit">U{index + 2}</div>

              {/* Status LEDs */}
              <div className="m10-led-array">
                <div className={`m10-led ${isError ? 'm10-led-red' : (isPowered ? 'm10-led-green' : 'm10-led-orange')}`} />
                <div className={`m10-led ${isPowered ? 'm10-led-blue' : ''}`} />
              </div>

              {/* Service Label */}
              <div className="m10-blade-label">{server.label}</div>

              {/* Cooling Vents */}
              <div className="m10-hex-mesh" />

              {/* Ethernet Connector */}
              <div className="m10-eth-connector" />
            </div>
          );
        })}
      </div>

      {/* Progress Meter */}
      {phase === 'PLAYING' && (
        <>
          <div className="m10-progress-bar-container">
            <div className="m10-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="m10-status-footer">
            <div className="m10-status-text">
              Blades Online: <span>{poweredBlades.size}/{RACK_SERVERS.length}</span>
            </div>
            <div className="m10-status-text">
              Strikes: <span style={{ color: strikes > 0 ? '#ef4444' : '#64748b' }}>{strikes}/3</span>
            </div>
          </div>
        </>
      )}

      {/* ── GAMEOVER Overlay ── */}
      {phase === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-[#05010e]/95 flex flex-col items-center justify-center z-50 backdrop-blur-md">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-[#ef4444]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-[0.2em] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Connection Refused</h2>
          <p className="text-[#ef4444]/60 text-xs uppercase tracking-[0.2em] mb-6">System Lockout Initiated</p>
          <p className="text-[#ef4444]/80 max-w-md text-center leading-relaxed mb-8 text-sm">
            Too many misrouted connections. The master switch has triggered a safety lockout to prevent cascading failures.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#ef4444]/10 border border-[#ef4444]/50 text-[#ef4444] rounded-lg font-bold uppercase tracking-widest hover:bg-[#ef4444]/20 hover:border-[#ef4444] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Reboot Rack
          </button>
        </div>
      )}

      {/* ── WON Overlay ── */}
      {phase === 'WON' && (
        <div className="absolute inset-0 bg-[#05010e]/95 flex flex-col items-center justify-center z-50 backdrop-blur-md">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
            <Server className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-[0.2em] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rack Online</h2>
          <p className="text-[#10b981]/60 text-xs uppercase tracking-[0.2em] mb-6">All Systems Operational</p>
          <p className="text-[#10b981]/70 max-w-md text-center leading-relaxed mb-8 text-sm">
            All blade servers have been successfully mapped to their correct service ports. The datacenter is fully operational.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 hover:border-[#10b981] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Restart Simulation
          </button>
        </div>
      )}

    </div>
  );
}
