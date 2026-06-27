import { useState } from 'react';
import { Volume2, VolumeX, Server, ShieldAlert } from 'lucide-react';
import './index10game.css';

/* ─── Data & Types ──────────────────────────────────────── */

type Phase = 'START' | 'PLAYING' | 'WON' | 'GAMEOVER';

interface ServerNode {
  id: string;
  label: string;
  port: number;
}

// The physical blades in the rack
const RACK_SERVERS: ServerNode[] = [
  { id: 'blade-01', label: 'HTTP WEB', port: 80 },
  { id: 'blade-02', label: 'SECURE SHELL', port: 22 },
  { id: 'blade-03', label: 'FILE TRANSFER', port: 21 },
  { id: 'blade-04', label: 'HTTPS WEB', port: 443 },
  { id: 'blade-05', label: 'MYSQL DB', port: 3306 },
  { id: 'blade-06', label: 'DNS RESOLVER', port: 53 },
  { id: 'blade-07', label: 'SMTP MAIL', port: 25 },
  { id: 'blade-08', label: 'REMOTE DESK', port: 3389 },
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
      // Startup beep
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(880, c.currentTime); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
      // Fan spin up
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
  
  // Game State
  const [requestQueue, setRequestQueue] = useState<ServerNode[]>([]);
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);
  const [poweredBlades, setPoweredBlades] = useState<Set<number>>(new Set());
  const [errorBlade, setErrorBlade] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);

  const startGame = () => {
    sound.playPowerOn();
    // Shuffle requests so they are random each time
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
    if (poweredBlades.has(index)) return; // Already powered

    const activeRequest = requestQueue[activeRequestIndex];
    const clickedBlade = RACK_SERVERS[index];

    if (clickedBlade.port === activeRequest.port) {
      // Correct Routing
      sound.playPowerOn();
      setPoweredBlades(prev => new Set(prev).add(index));
      
      if (activeRequestIndex + 1 < requestQueue.length) {
        setActiveRequestIndex(i => i + 1);
      } else {
        // All blades powered!
        setTimeout(() => {
          sound.playWin();
          setPhase('WON');
        }, 500);
      }
    } else {
      // Incorrect Routing
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

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] select-none m10-game-container">
      
      {/* HUD Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#565f89] font-bold">
          NOC Dashboard // Room 10
        </span>
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#2a2d34] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#565f89]" /> : <Volume2 className="w-4 h-4 text-[#565f89]" />}
          </button>
        </div>
      </div>

      {phase === 'START' && (
        <div className="absolute inset-0 bg-[#0a0c10]/95 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-6">
          <Server className="w-16 h-16 text-[#00ff88] mb-6" />
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-4">Datacenter Setup</h2>
          <p className="text-[#a9b1d6] max-w-md text-center leading-relaxed mb-8">
            Network Engineer, we are booting up the new Obsidian Server Rack.
            The Master Switch is receiving incoming port traffic. You must manually map the incoming traffic to the correct physical Blade Server to power it on.
          </p>
          <button onClick={startGame} className="px-8 py-3 bg-[#00ff88]/10 border border-[#00ff88] text-[#00ff88] rounded-md font-bold uppercase tracking-widest hover:bg-[#00ff88]/20 transition-colors cursor-pointer">
            Initialize Rack
          </button>
        </div>
      )}

      {/* The CSS Server Rack */}
      <div className="m10-server-rack">
        
        {/* Top Master Switch Router */}
        <div className="m10-master-switch">
          <div className="m10-switch-logo">
            SYS<span>ROUTER</span>
          </div>
          <div className="m10-switch-lcd">
            <div className="m10-lcd-label">
              {phase === 'PLAYING' ? 'INCOMING TRAFFIC ROUTE' : 'SYSTEM STATUS'}
            </div>
            <div className="m10-lcd-data">
              {phase === 'PLAYING' && activeRequest ? `PORT ${activeRequest.port}` : (phase === 'WON' ? 'ONLINE' : 'STANDBY')}
            </div>
          </div>
          <div className="m10-led-array">
            <div className={`m10-led ${phase === 'PLAYING' ? 'm10-led-blue' : 'm10-led-orange'}`}></div>
            <div className={`m10-led ${strikes > 0 ? 'm10-led-red' : 'm10-led'}`}></div>
            <div className={`m10-led ${strikes > 1 ? 'm10-led-red' : 'm10-led'}`}></div>
          </div>
        </div>

        {/* Space between switch and blades */}
        <div className="h-2"></div>

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
              {/* Status LEDs for the blade */}
              <div className="m10-led-array">
                <div className={`m10-led ${isError ? 'm10-led-red' : (isPowered ? 'm10-led-green' : 'm10-led-orange')}`}></div>
                <div className={`m10-led ${isPowered ? 'm10-led-blue' : 'm10-led'}`}></div>
              </div>

              {/* Service Label */}
              <div className="m10-blade-label">
                {server.label}
              </div>

              {/* Cooling Vents */}
              <div className="m10-hex-mesh"></div>
            </div>
          );
        })}
      </div>

      {phase === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-50 backdrop-blur-md">
          <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
          <h2 className="text-4xl font-bold text-white uppercase tracking-[0.2em] mb-4">CONNECTION REFUSED</h2>
          <p className="text-red-300 max-w-md text-center leading-relaxed mb-8">
            You misrouted the traffic too many times. The master switch has locked up.
          </p>
          <button onClick={startGame} className="px-8 py-3 bg-red-500/20 border border-red-500 text-red-400 rounded-md font-bold uppercase tracking-widest hover:bg-red-500/40 transition-colors cursor-pointer">
            Reboot Rack
          </button>
        </div>
      )}

      {phase === 'WON' && (
        <div className="absolute inset-0 bg-[#051a15]/90 flex flex-col items-center justify-center z-50 backdrop-blur-md">
          <Server className="w-20 h-20 text-[#00ff88] mb-6" />
          <h2 className="text-4xl font-bold text-white uppercase tracking-[0.2em] mb-4">RACK ONLINE</h2>
          <p className="text-[#00ff88]/80 max-w-md text-center leading-relaxed mb-8">
            All blade servers have been successfully mapped to their correct service ports. The datacenter is fully operational.
          </p>
          <button onClick={startGame} className="px-8 py-3 bg-[#00ff88]/10 border border-[#00ff88] text-[#00ff88] rounded-md font-bold uppercase tracking-widest hover:bg-[#00ff88]/20 transition-colors cursor-pointer">
            Restart Simulation
          </button>
        </div>
      )}

    </div>
  );
}
