import { useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, ShieldAlert, Network, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index12game.css';

/* ─── Types & Data ──────────────────────────────────────── */

type GamePhase = 'START' | 'TRIAGE' | 'WON' | 'LOST';
type TargetType = 'LOCAL' | 'DEAD' | 'LIVE';
type TriageStatus = 'UNCLASSIFIED' | 'LOCAL' | 'DEAD' | 'LIVE';

interface Target {
  id: string;
  name: string;
  ip: string;
  type: TargetType;
  status: TriageStatus;
  hops: string[];
}

// Generate realistic looking traceroute hops
const generateHops = (type: TargetType, targetIp: string): string[] => {
  const hops: string[] = [];
  hops.push(`traceroute to ${targetIp} (${targetIp}), 30 hops max, 60 byte packets`);
  hops.push(` 1  192.168.1.1 (192.168.1.1)  2.124 ms  1.983 ms`);
  
  if (type === 'LOCAL') {
    // Dies very early in ISP
    hops.push(` 2  10.14.22.1 (10.14.22.1)  14.231 ms  13.902 ms`);
    hops.push(` 3  * * *`);
    hops.push(` 4  * * *`);
    hops.push(` 5  * * *`);
    return hops;
  }

  // Common middle hops
  hops.push(` 2  10.14.22.1 (10.14.22.1)  14.231 ms  13.902 ms`);
  hops.push(` 3  core-isp-router.local (172.16.0.4)  22.104 ms  21.844 ms`);
  hops.push(` 4  lag-10.ear1.nyc1.net (198.51.100.12)  31.055 ms  30.912 ms`);
  hops.push(` 5  203.0.113.88 (203.0.113.88)  34.120 ms  35.201 ms`);

  if (type === 'DEAD') {
    // Dies in the backbone
    hops.push(` 6  core-backbone-us-east.net (198.51.100.200)  42.110 ms  41.905 ms`);
    hops.push(` 7  * * *`);
    hops.push(` 8  * * *`);
    hops.push(` 9  * * *`);
    return hops;
  }

  if (type === 'LIVE') {
    // Reaches destination network but filters ping at the very end
    hops.push(` 6  core-backbone-us-east.net (198.51.100.200)  42.110 ms  41.905 ms`);
    hops.push(` 7  obsidian-edge-gw.net (104.22.10.1)  45.002 ms  44.891 ms`);
    hops.push(` 8  obsidian-internal-fw.local (10.0.5.1)  46.105 ms  46.220 ms`);
    hops.push(` 9  * * *`);
    hops.push(`10  * * *`);
    return hops;
  }

  return hops;
};

const INITIAL_ROSTER: Target[] = [
  { id: 't1', name: 'Alpha Node', ip: '198.51.100.45', type: 'LOCAL', status: 'UNCLASSIFIED', hops: generateHops('LOCAL', '198.51.100.45') },
  { id: 't2', name: 'Beta Server', ip: '203.0.113.102', type: 'DEAD', status: 'UNCLASSIFIED', hops: generateHops('DEAD', '203.0.113.102') },
  { id: 't3', name: 'Obsidian Vault', ip: '104.22.10.99', type: 'LIVE', status: 'UNCLASSIFIED', hops: generateHops('LIVE', '104.22.10.99') },
  { id: 't4', name: 'Gamma Relay', ip: '192.0.2.15', type: 'DEAD', status: 'UNCLASSIFIED', hops: generateHops('DEAD', '192.0.2.15') },
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

  playKeystroke() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(800 + Math.random()*200, c.currentTime); g.gain.setValueAtTime(0.01, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.05); } catch {}
  }
  playSuccess() {
    if (this.isMuted) return;
    try { const c = this.init(), now = c.currentTime; [440, 554.37, 659.25, 880].forEach((f, i) => { const t = now + i * 0.1; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.3); }); } catch {}
  }
  playError() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, c.currentTime); o.frequency.linearRampToValueAtTime(80, c.currentTime + 0.3); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.3); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3); } catch {}
  }
}

const sound = new SoundManager();

/* ─── Component ─────────────────────────────────────────── */

export default function Modul12Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [roster, setRoster] = useState<Target[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  
  const [traceLines, setTraceLines] = useState<string[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const traceTimeoutRef = useRef<number | null>(null);

  const startGame = useCallback(() => {
    // Shuffle and copy roster
    const shuffled = [...INITIAL_ROSTER].sort(() => Math.random() - 0.5);
    setRoster(shuffled);
    setActiveTargetId(shuffled[0].id);
    setTraceLines([]);
    setIsTracing(false);
    setPhase('TRIAGE');
  }, []);

  // Run the trace animation for the selected target
  const runTrace = (targetId: string) => {
    if (isTracing) return;
    
    if (traceTimeoutRef.current) {
      clearTimeout(traceTimeoutRef.current);
    }

    setActiveTargetId(targetId);
    setTraceLines([]);
    setIsTracing(true);

    const target = roster.find(t => t.id === targetId);
    if (!target) return;

    let lineIndex = 0;
    
    const printNextLine = () => {
      if (lineIndex < target.hops.length) {
        sound.playKeystroke();
        setTraceLines(prev => [...prev, target.hops[lineIndex]]);
        lineIndex++;
        
        // Delay between hops (longer delay for * * *)
        const isTimeout = target.hops[lineIndex - 1].includes('* * *');
        const delay = isTimeout ? 800 : 300 + Math.random() * 200;
        
        traceTimeoutRef.current = window.setTimeout(printNextLine, delay);
      } else {
        setIsTracing(false);
      }
    };

    printNextLine();
  };

  // Allow clicking target cards to trace them
  const handleTargetClick = (id: string) => {
    if (isTracing) return;
    if (activeTargetId !== id) {
      runTrace(id);
    }
  };

  const handleTriage = (status: TriageStatus) => {
    if (!activeTargetId || isTracing) return;
    setRoster(prev => prev.map(t => t.id === activeTargetId ? { ...t, status } : t));
    sound.playKeystroke();
  };

  const handleSubmit = () => {
    const allCorrect = roster.every(t => t.type === t.status);
    if (allCorrect) {
      sound.playSuccess();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#a258ff', '#ffffff'] });
      setPhase('WON');
    } else {
      sound.playError();
      setPhase('LOST');
    }
  };

  const activeTarget = roster.find(t => t.id === activeTargetId);
  const allClassified = roster.every(t => t.status !== 'UNCLASSIFIED');

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] m12-container">
      
      {/* HUD */}
      <div className="m12-hud">
        <div className="m12-hud-title">Network Ops &bull; Room 12</div>
        <div className="m12-hud-stats">
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#1e2230] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#64748b]" /> : <Volume2 className="w-4 h-4 text-[#64748b]" />}
          </button>
        </div>
      </div>

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#a258ff]/20 to-[#10b981]/10 border border-[#a258ff]/30 flex items-center justify-center">
            <Network className="w-10 h-10 text-[#a258ff]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Radio Silence</h2>
          <p className="text-[#a258ff] text-xs uppercase tracking-[0.2em] mb-6">Traceroute Triage</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>Ping is blocked. All targets are returning <strong className="text-[#ef4444]">Request Timed Out</strong>.</p>
            <p>You must run <strong className="text-[#a258ff]">traceroute</strong> on each target in the roster to see where the connection dies.</p>
            <ul className="text-left bg-[#0d061a] p-4 rounded border border-[#23123a] space-y-2 mt-4 text-xs">
              <li><strong className="text-[#eab308]">LOCAL FAULT:</strong> Trace dies in the first few hops (ISP/Local router). Connection issue on your end.</li>
              <li><strong className="text-[#ef4444]">DEAD PATH:</strong> Trace dies in the middle of the internet backbone. The path is broken.</li>
              <li><strong className="text-[#10b981]">LIVE/STEALTH:</strong> Trace reaches the final destination network before going silent. The target is alive and filtering ping.</li>
            </ul>
            <p>Classify all targets correctly to clear the room.</p>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#a258ff]/10 border border-[#a258ff]/50 text-[#a258ff] rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff]/20 hover:border-[#a258ff] transition-all cursor-pointer text-sm">
            Begin Triage
          </button>
        </div>
      )}

      {/* ── TRIAGE PHASE ── */}
      {phase === 'TRIAGE' && (
        <div className="m12-layout">
          
          {/* Roster Sidebar */}
          <div className="m12-sidebar">
            <div className="m12-sidebar-header">Target Roster</div>
            {roster.map(target => (
              <div 
                key={target.id}
                className={`m12-target-card ${activeTargetId === target.id ? 'active' : ''}`}
                onClick={() => handleTargetClick(target.id)}
              >
                <div className="m12-target-name">{target.name}</div>
                <div className="m12-target-ip">{target.ip}</div>
                
                {target.status === 'UNCLASSIFIED' && <span className="m12-badge m12-badge-unclassified">Unclassified</span>}
                {target.status === 'LOCAL' && <span className="m12-badge m12-badge-local">Local Fault</span>}
                {target.status === 'DEAD' && <span className="m12-badge m12-badge-dead">Dead Path</span>}
                {target.status === 'LIVE' && <span className="m12-badge m12-badge-live">Live / Stealth</span>}
              </div>
            ))}

            <div className="mt-auto">
              <button 
                className="w-full m12-btn m12-submit-btn"
                disabled={!allClassified || isTracing}
                onClick={handleSubmit}
              >
                Submit Triage Report
              </button>
            </div>
          </div>

          {/* Terminal Area */}
          <div className="m12-terminal flex flex-col relative">
            <div className="m12-term-header">
              <div className="m12-term-dots">
                <div className="m12-term-dot r"></div>
                <div className="m12-term-dot y"></div>
                <div className="m12-term-dot g"></div>
              </div>
              <div className="m12-term-title">bash — traceroute</div>
            </div>

            <div className="m12-term-body">
              {!isTracing && traceLines.length === 0 && (
                <div className="text-slate-500 italic">Select a target from the roster to initiate trace...</div>
              )}
              
              {traceLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line}
                </div>
              ))}
              
              {isTracing && (
                <div><span className="m12-cursor"></span></div>
              )}
              
              {!isTracing && traceLines.length > 0 && (
                <div className="mt-4 text-[#10b981] font-bold">root@sentinel:~# <span className="m12-cursor"></span></div>
              )}
            </div>

            {/* Classification Controls for Active Target */}
            <div className="m12-triage-panel">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Classify: <span className="text-white">{activeTarget?.ip}</span>
              </div>
              <div className="m12-triage-buttons">
                <button 
                  className="m12-btn m12-btn-local" 
                  onClick={() => handleTriage('LOCAL')}
                  disabled={isTracing}
                >
                  Local Fault
                </button>
                <button 
                  className="m12-btn m12-btn-dead" 
                  onClick={() => handleTriage('DEAD')}
                  disabled={isTracing}
                >
                  Dead Path
                </button>
                <button 
                  className="m12-btn m12-btn-live" 
                  onClick={() => handleTriage('LIVE')}
                  disabled={isTracing}
                >
                  Live / Stealth
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── WON ── */}
      {phase === 'WON' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Triage Accurate</h2>
          <p className="text-[#10b981]/60 text-xs uppercase tracking-[0.2em] mb-6">Promising Lead Identified</p>
          <p className="text-[#10b981]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            You successfully parsed the network paths. You ignored the local faults, discarded the broken paths, and zeroed in on the Obsidian Vault hiding behind its firewall.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 transition-all cursor-pointer text-sm">
            Restart Simulation
          </button>
        </div>
      )}

      {/* ── LOST ── */}
      {phase === 'LOST' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-[#ef4444]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Triage Failed</h2>
          <p className="text-[#ef4444]/60 text-xs uppercase tracking-[0.2em] mb-6">Lead Lost</p>
          <p className="text-[#ef4444]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            You misclassified the targets. Remember: if the trace dies at hop 2, it's local. If it dies in the middle, the path is broken. It's only a Live/Stealth target if the packet reaches the very end of the routing journey before timing out.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#ef4444]/10 border border-[#ef4444]/50 text-[#ef4444] rounded-lg font-bold uppercase tracking-widest hover:bg-[#ef4444]/20 transition-all cursor-pointer text-sm">
            Retry Triage
          </button>
        </div>
      )}

    </div>
  );
}
