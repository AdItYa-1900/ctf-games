import { useState, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Volume2, VolumeX, Globe, FileText, Users, Server, Search, Crosshair, Building, X, AlertTriangle, GitBranch, Code } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index15game.css';

/* ─── Types & Data ──────────────────────────────────────── */

type GamePhase = 'START' | 'PLAYING' | 'WON';
type ToolType = 'whois' | 'google' | 'theHarvester' | 'shodan' | 'githunter';
type NodeType = 'domain' | 'email' | 'document' | 'org' | 'ip' | 'social' | 'code';

interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  isError?: boolean;
}

interface EdgeData {
  from: string;
  to: string;
}

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
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(600, c.currentTime); g.gain.setValueAtTime(0.02, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.05); } catch {}
  }
  playSpawn() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(400, c.currentTime); o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.2); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2); } catch {}
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

const INITIAL_NODE: NodeData = { id: 'root', type: 'domain', label: 'blackout-control.net', x: 2000, y: 2000 };

/* ─── Component ─────────────────────────────────────────── */

export default function Modul15Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [nodes, setNodes] = useState<NodeData[]>([INITIAL_NODE]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  
  const [errorToast, setErrorToast] = useState('');
  
  // Modal state
  const [modalOpenId, setModalOpenId] = useState<string | null>(null);
  const [textExtracted, setTextExtracted] = useState(false);

  // Pan Canvas State
  const [pan, setPan] = useState({ x: -1500, y: -1700 }); // Center initial node on screen roughly
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const startGame = useCallback(() => {
    setActiveTool(null);
    setNodes([INITIAL_NODE]);
    setEdges([]);
    setErrorToast('');
    setModalOpenId(null);
    setTextExtracted(false);
    setPan({ x: -1500, y: -1700 });
    setPhase('PLAYING');
  }, []);

  const handleToolSelect = (tool: ToolType) => {
    sound.playClick();
    setActiveTool(tool);
  };

  const spawnNode = (fromId: string, newNodes: NodeData[]) => {
    sound.playSpawn();
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newNodes.map(n => ({ from: fromId, to: n.id }))]);
    setActiveTool(null);
  };

  const showError = (nodeId: string, msg: string) => {
    sound.playError();
    setErrorToast(msg);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isError: true } : n));
    setTimeout(() => {
      setErrorToast('');
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isError: false } : n));
    }, 2000);
    setActiveTool(null);
  };

  const handleNodeClick = (node: NodeData) => {
    if (!activeTool) {
      if (node.type === 'document' || node.type === 'code') {
        sound.playClick();
        setModalOpenId(node.id);
      }
      return;
    }

    /* ─── GRAPH LOGIC RULES ─── */
    
    if (activeTool === 'whois') {
      if (node.type === 'domain') {
        if (node.id === 'root' && !nodes.find(n => n.id === 'whois1')) {
          spawnNode('root', [{ id: 'whois1', type: 'org', label: 'Registrant: REDACTED', x: 2250, y: 2000 }]);
        } else {
          showError(node.id, "No new intelligence found.");
        }
      } else {
        showError(node.id, "WHOIS is used to query domain registrars.");
      }
    } 
    else if (activeTool === 'theHarvester') {
      if (node.type === 'domain') {
        if (node.id === 'root' && !nodes.find(n => n.id === 'harv1')) {
          // HUGE NOISE DUMP
          spawnNode('root', [
            { id: 'harv1', type: 'email', label: 'admin@blackout-control.net', x: 1700, y: 2200 },
            { id: 'harv2', type: 'email', label: 'support@blackout-control.net', x: 1850, y: 2200 },
            { id: 'harv3', type: 'email', label: 'j.doe@blackout-control.net', x: 2000, y: 2200 },
            { id: 'harv4', type: 'email', label: 's.connor@blackout-control.net', x: 2150, y: 2200 },
            { id: 'harv5', type: 'email', label: 'e.williams@blackout-control.net', x: 2300, y: 2200 }
          ]);
        } else {
          showError(node.id, "No new emails found for this domain.");
        }
      } else {
        showError(node.id, "theHarvester targets domains to extract personnel emails.");
      }
    }
    else if (activeTool === 'google') {
      if (node.type === 'domain' || node.type === 'email') {
        if (node.id === 'root') {
          showError(node.id, "Too much noise. Pivot from a specific email to narrow your search.");
        } else if (node.id === 'harv1' && !nodes.find(n => n.id === 'goog1')) {
          spawnNode('harv1', [{ id: 'goog1', type: 'document', label: 'IT-Policy.pdf', x: 1700, y: 2400 }]);
        } else if (node.id === 'harv4' && !nodes.find(n => n.id === 'goog2')) {
          spawnNode('harv4', [{ id: 'goog2', type: 'document', label: 'Marketing-Q1.pdf', x: 2150, y: 2400 }]);
        } else if (node.id === 'harv5' && !nodes.find(n => n.id === 'social1')) {
          // The true path finds a GitHub profile!
          spawnNode('harv5', [{ id: 'social1', type: 'social', label: 'GitHub: ewilliams-dev', x: 2300, y: 2400 }]);
        } else if (node.id === 'harv2' || node.id === 'harv3') {
          showError(node.id, "No public documents or social profiles linked to this email.");
        } else {
          showError(node.id, "No new intelligence found.");
        }
      } else {
        showError(node.id, "Google Dorks are best used on domains or emails.");
      }
    }
    else if (activeTool === 'githunter') {
      if (node.type === 'social') {
        if (node.id === 'social1' && !nodes.find(n => n.id === 'code1')) {
          spawnNode('social1', [{ id: 'code1', type: 'code', label: 'repo: docker-compose.yml', x: 2300, y: 2600 }]);
        }
      } else {
        showError(node.id, "GitHunter specifically scans GitHub social profiles for public repositories.");
      }
    }
    else if (activeTool === 'shodan') {
      if (node.type === 'domain') {
        if (node.id === 'root' && !nodes.find(n => n.id === 'shodan1')) {
          // NOISE DUMP
          spawnNode('root', [
            { id: 'shodan1', type: 'ip', label: '198.51.100.10 (Web)', x: 1750, y: 1800 },
            { id: 'shodan2', type: 'ip', label: '198.51.100.15 (Mail)', x: 2000, y: 1800 },
            { id: 'shodan3', type: 'ip', label: '198.51.100.25 (DNS)', x: 2250, y: 1800 }
          ]);
        } else if (node.id === 'sub1' && !nodes.find(n => n.id === 'shodan_win')) {
          spawnNode('sub1', [{ id: 'shodan_win', type: 'ip', label: '198.51.100.105 (PostgreSQL)', x: 2550, y: 2800 }]);
        } else {
          showError(node.id, "No new open ports or exposed services found.");
        }
      } else {
        showError(node.id, "Shodan scans domains, subdomains, or IPs.");
      }
    }
  };

  const handleExtractText = () => {
    if (textExtracted) return;
    sound.playSpawn();
    setTextExtracted(true);
    setModalOpenId(null);
    setNodes(prev => [...prev, { id: 'sub1', type: 'domain', label: 'db-staging.blackout-control.net', x: 2550, y: 2600 }]);
    setEdges(prev => [...prev, { from: 'code1', to: 'sub1' }]);
  };

  const handleWin = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // Honeypot check
    if (nodeId === 'shodan1' || nodeId === 'shodan2' || nodeId === 'shodan3') {
      showError(nodeId, "WARNING: This is a public infrastructure server. It is heavily monitored and not our target. Keep searching!");
      return;
    }
    
    // True target
    if (nodeId === 'shodan_win') {
      sound.playSuccess();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#a258ff', '#ffffff'] });
      setPhase('WON');
    }
  };

  // Canvas Panning Logic
  const onMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onMouseUp = () => setIsDragging(false);

  // SVG Line Renderer
  const renderLines = () => {
    return edges.map((e, i) => {
      const fromNode = nodes.find(n => n.id === e.from);
      const toNode = nodes.find(n => n.id === e.to);
      if (!fromNode || !toNode) return null;
      // Center of nodes
      const x1 = fromNode.x + 100;
      const y1 = fromNode.y + 20;
      const x2 = toNode.x + 100;
      const y2 = toNode.y + 20;
      
      return (
        <line 
          key={i} 
          x1={x1} y1={y1} x2={x2} y2={y2} 
          className="m15-edge-line"
        />
      );
    });
  };

  return (
    <div className="relative w-full max-w-6xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] m15-container overflow-hidden">
      
      {/* HUD */}
      <div className="m15-hud">
        <div className="m15-hud-title">OSINT Deep Investigation &bull; Room 15</div>
        <div className="m15-hud-controls flex items-center gap-4">
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#1a0b2e] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#64748b]" /> : <Volume2 className="w-4 h-4 text-[#64748b]" />}
          </button>
        </div>
      </div>

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#a258ff]/20 to-[#10b981]/10 border border-[#a258ff]/30 flex items-center justify-center">
            <Search className="w-10 h-10 text-[#a258ff]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Deep Investigation</h2>
          <p className="text-[#a258ff] text-xs uppercase tracking-[0.2em] mb-6">Cross-Platform OSINT Canvas</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>You have a starting target: <strong className="text-white">blackout-control.net</strong>.</p>
            <p><strong>Your Mission:</strong></p>
            <ol className="list-decimal text-left inline-block max-w-[480px]">
              <li className="ml-4">Select a tool and click a node to scan it.</li>
              <li className="ml-4">Scans will dump <strong className="text-[#eab308]">massive amounts of noise</strong> (decoy IPs and emails). You must deduce the correct path.</li>
              <li className="ml-4">Click and drag the background to <strong className="text-[#3b82f6]">pan the infinite canvas</strong>.</li>
              <li className="ml-4">Pivot from Domain → Email → Social Profile → Source Code to find the vulnerable <strong className="text-[#ef4444]">Database IP</strong>.</li>
            </ol>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#a258ff]/10 border border-[#a258ff]/50 text-[#a258ff] rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff]/20 hover:border-[#a258ff] transition-all cursor-pointer text-sm">
            Access Link Analyst Canvas
          </button>
        </div>
      )}

      {/* ── PLAYING PHASE ── */}
      {phase === 'PLAYING' && (
        <div className="m15-layout">
          
          {/* Tool Arsenal */}
          <div className="m15-arsenal-bar">
            
            <div className={`m15-tool-btn ${activeTool === 'whois' ? 'active' : ''}`} onClick={() => handleToolSelect('whois')}>
              <div className="m15-tool-icon"><Globe className="w-4 h-4" /></div>
              <div className="m15-tool-info">
                <span className="m15-tool-name">WHOIS</span>
                <span className="m15-tool-desc">Find Registrar</span>
              </div>
            </div>

            <div className={`m15-tool-btn ${activeTool === 'theHarvester' ? 'active' : ''}`} onClick={() => handleToolSelect('theHarvester')}>
              <div className="m15-tool-icon"><Users className="w-4 h-4" /></div>
              <div className="m15-tool-info">
                <span className="m15-tool-name">theHarvester</span>
                <span className="m15-tool-desc">Find Emails</span>
              </div>
            </div>

            <div className={`m15-tool-btn ${activeTool === 'google' ? 'active' : ''}`} onClick={() => handleToolSelect('google')}>
              <div className="m15-tool-icon"><Search className="w-4 h-4" /></div>
              <div className="m15-tool-info">
                <span className="m15-tool-name">Google Dorks</span>
                <span className="m15-tool-desc">Find Docs/Social</span>
              </div>
            </div>

            <div className={`m15-tool-btn ${activeTool === 'githunter' ? 'active' : ''}`} onClick={() => handleToolSelect('githunter')}>
              <div className="m15-tool-icon"><GitBranch className="w-4 h-4" /></div>
              <div className="m15-tool-info">
                <span className="m15-tool-name">GitHunter</span>
                <span className="m15-tool-desc">Scan Repositories</span>
              </div>
            </div>

            <div className={`m15-tool-btn ${activeTool === 'shodan' ? 'active' : ''}`} onClick={() => handleToolSelect('shodan')}>
              <div className="m15-tool-icon"><Server className="w-4 h-4" /></div>
              <div className="m15-tool-info">
                <span className="m15-tool-name">Shodan</span>
                <span className="m15-tool-desc">Scan IP / Service</span>
              </div>
            </div>

          </div>

          {/* Infinite Node Canvas */}
          <div 
            className="m15-canvas-viewport" 
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div 
              className="m15-canvas-layer"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
              onClick={() => setActiveTool(null)}
            >
              <svg className="m15-canvas-svg">
                {renderLines()}
              </svg>

              {nodes.map(n => (
                <div 
                  key={n.id}
                  className={`m15-node ${n.isError ? 'error' : ''} ${activeTool ? 'targetable' : ''} ${n.type === 'ip' ? 'win-node' : ''}`}
                  style={{ left: n.x, top: n.y }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent panning when clicking node
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(n); }}
                >
                  <div className="m15-node-icon">
                    {n.type === 'domain' && <Globe className="w-5 h-5" />}
                    {n.type === 'email' && <Users className="w-5 h-5" />}
                    {n.type === 'document' && <FileText className="w-5 h-5" />}
                    {n.type === 'org' && <Building className="w-5 h-5" />}
                    {n.type === 'social' && <GitBranch className="w-5 h-5" />}
                    {n.type === 'code' && <Code className="w-5 h-5" />}
                    {n.type === 'ip' && <Crosshair className="w-5 h-5" />}
                  </div>
                  <div className="m15-node-info">
                    <span className="m15-node-type">{n.type}</span>
                    <span className="m15-node-label">{n.label}</span>
                    {n.type === 'ip' && (
                      <button className="m15-target-btn" onClick={(e) => handleWin(e, n.id)}>Acquire Target</button>
                    )}
                    {(n.type === 'document' || n.type === 'code') && !activeTool && (
                      <span className="text-[9px] text-[#10b981] uppercase mt-1 cursor-pointer">Click to Read</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {errorToast && (
              <div className="m15-error-toast flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {errorToast}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Modals ── */}
      {modalOpenId === 'code1' && (
        <div className="m15-modal-overlay">
          <div className="m15-modal">
            <div className="m15-modal-header">
              <div className="m15-modal-title">docker-compose.yml</div>
              <div className="m15-modal-close" onClick={() => { sound.playClick(); setModalOpenId(null); }}><X className="w-4 h-4"/></div>
            </div>
            <div className="m15-modal-body-code">
{`version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DB_HOST=`}<span 
          className={`m15-extractable-text ${textExtracted ? 'extracted' : ''}`}
          onClick={handleExtractText}
          title="Click to Extract Entity"
        >db-staging.blackout-control.net</span>{`
      - DB_USER=admin_staging
      - DB_PASS=hunter2
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

  database:
    image: postgres:15
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data`}
            </div>
          </div>
        </div>
      )}

      {modalOpenId === 'goog1' && (
        <div className="m15-modal-overlay">
          <div className="m15-modal">
            <div className="m15-modal-header">
              <div className="m15-modal-title text-slate-400">IT-Policy.pdf</div>
              <div className="m15-modal-close" onClick={() => { sound.playClick(); setModalOpenId(null); }}><X className="w-4 h-4"/></div>
            </div>
            <div className="m15-modal-body-pdf text-slate-500">
              <h2>Standard IT Policy</h2>
              <p>
                All passwords must be a minimum of 14 characters, including symbols, numbers, and uppercase letters.
                Do not write passwords on sticky notes. Do not commit secrets to public repositories.
              </p>
              <div className="mt-8 p-4 border border-dashed border-slate-300 rounded text-center text-xs">
                [ No hardcoded intelligence found in this document. ]
              </div>
            </div>
          </div>
        </div>
      )}
      
      {modalOpenId === 'goog2' && (
        <div className="m15-modal-overlay">
          <div className="m15-modal">
            <div className="m15-modal-header">
              <div className="m15-modal-title text-slate-400">Marketing-Q1.pdf</div>
              <div className="m15-modal-close" onClick={() => { sound.playClick(); setModalOpenId(null); }}><X className="w-4 h-4"/></div>
            </div>
            <div className="m15-modal-body-pdf text-slate-500">
              <h2>Q1 Marketing Reach</h2>
              <p>
                Impressions are up by 20% in the LATAM market.
              </p>
              <div className="mt-8 p-4 border border-dashed border-slate-300 rounded text-center text-xs">
                [ No technical intelligence found in this document. ]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WON ── */}
      {phase === 'WON' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
            <Crosshair className="w-10 h-10 text-[#ef4444]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Database Located</h2>
          <p className="text-[#ef4444]/60 text-xs uppercase tracking-[0.2em] mb-6">Cross-Platform OSINT Complete</p>
          <div className="bg-[#1a0b2e] border border-[#ef4444]/30 p-6 rounded-lg mb-8 max-w-lg w-full text-center space-y-2">
            <p className="text-[#f1f5f9] font-mono text-sm leading-relaxed">
              You successfully filtered out the noise. You found an employee's email, pivoted to their GitHub profile, uncovered a leaked `docker-compose.yml`, and extracted the vulnerable database IP (<strong className="text-[#ef4444]">198.51.100.105</strong>).
            </p>
          </div>
          <p className="text-[#ef4444]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            This is exactly how modern breaches occur. Developers leaving secrets in public repositories is one of the most common vectors in cybersecurity.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#ef4444]/10 border border-[#ef4444]/50 text-[#ef4444] rounded-lg font-bold uppercase tracking-widest hover:bg-[#ef4444]/20 transition-all cursor-pointer text-sm">
            Restart Investigation
          </button>
        </div>
      )}

    </div>
  );
}
