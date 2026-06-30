import { useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { Volume2, VolumeX, ShieldAlert, Search, Activity, X, Lock, Unlock } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index13game.css';

/* ─── Types & Data ──────────────────────────────────────── */

type GamePhase = 'START' | 'PLAYING' | 'WON';

interface Packet {
  id: string;
  no: number;
  source: string;
  dest: string;
  proto: string;
  info: string;
  streamId: string; // Used to group packets into streams
  protoClass: string;
}

// Stream 0 is the HTTP target, Stream 1 is the HTTPS decoy
const PACKETS: Packet[] = [
  { id: 'p1', no: 1, source: '192.168.1.50', dest: '203.0.113.8', proto: 'TCP', info: '443 > 51234 [SYN] Seq=0 Win=65535', streamId: 'stream1', protoClass: 'm13-proto-tcp' },
  { id: 'p2', no: 2, source: '192.168.1.50', dest: '203.0.113.8', proto: 'TCP', info: '80 > 51235 [SYN] Seq=0 Win=65535', streamId: 'stream0', protoClass: 'm13-proto-tcp' },
  { id: 'p3', no: 3, source: '192.168.1.50', dest: '203.0.113.8', proto: 'TLSv1.2', info: 'Client Hello', streamId: 'stream1', protoClass: 'm13-proto-tls' },
  { id: 'p4', no: 4, source: '192.168.1.50', dest: '203.0.113.8', proto: 'HTTP', info: 'GET /login.php HTTP/1.1', streamId: 'stream0', protoClass: 'm13-proto-http' },
  { id: 'p5', no: 5, source: '203.0.113.8', dest: '192.168.1.50', proto: 'TLSv1.2', info: 'Server Hello, Certificate, Server Key Exchange', streamId: 'stream1', protoClass: 'm13-proto-tls' },
  { id: 'p6', no: 6, source: '203.0.113.8', dest: '192.168.1.50', proto: 'HTTP', info: 'HTTP/1.1 200 OK (text/html)', streamId: 'stream0', protoClass: 'm13-proto-http' },
  { id: 'p7', no: 7, source: '192.168.1.50', dest: '203.0.113.8', proto: 'TLSv1.2', info: 'Application Data', streamId: 'stream1', protoClass: 'm13-proto-tls' },
  { id: 'p8', no: 8, source: '192.168.1.50', dest: '203.0.113.8', proto: 'HTTP', info: 'POST /login.php (application/x-www-form-urlencoded)', streamId: 'stream0', protoClass: 'm13-proto-http' },
  { id: 'p9', no: 9, source: '203.0.113.8', dest: '192.168.1.50', proto: 'TLSv1.2', info: 'Application Data', streamId: 'stream1', protoClass: 'm13-proto-tls' },
];

const STREAM_CONTENTS = {
  stream0: {
    type: 'CLEAR',
    content: (
      <>
        <span className="m13-stream-client">GET /login.php HTTP/1.1<br/>Host: obsidian.local<br/>User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)<br/>Accept: text/html<br/><br/></span>
        <span className="m13-stream-server">HTTP/1.1 200 OK<br/>Content-Type: text/html<br/>Server: Apache/2.4<br/>Content-Length: 1024<br/><br/>&lt;html&gt;...&lt;/html&gt;<br/><br/></span>
        <span className="m13-stream-client">POST /login.php HTTP/1.1<br/>Host: obsidian.local<br/>Content-Type: application/x-www-form-urlencoded<br/><br/></span>
        <span className="m13-stream-highlight">username=admin&amp;password=blackout2026</span>
      </>
    )
  },
  stream1: {
    type: 'CIPHER',
    content: (
      <>
        <span className="m13-stream-client">16 03 01 00 c8 01 00 00 c4 03 03 5e ... (Client Hello)<br/></span>
        <span className="m13-stream-server">16 03 03 00 5a 02 00 00 56 03 03 8f ... (Server Hello)<br/></span>
        <span className="m13-stream-cipher">
          {"\n"}... ENCRYPTED APPLICATION DATA ...{"\n\n"}
          #*&amp;%@!&amp;^#*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%<br/>
          a9f8 c7d6 e5f4 1234 abcd ef98 7654 3210 90ab cdef<br/>
          (Stream is encrypted using TLS_AES_256_GCM_SHA384)<br/>
          1029 3847 56a1 b2c3 d4e5 f607 1829 3a4b 5c6d 7e8f<br/>
          #*&amp;%@!&amp;^#*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%&amp;^*!@%
        </span>
      </>
    )
  }
};

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

export default function Modul13Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, streamId: string } | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const startGame = useCallback(() => {
    setContextMenu(null);
    setSelectedPacket(null);
    setActiveModal(null);
    setPhase('PLAYING');
  }, []);

  const handlePacketClick = (e: MouseEvent, packet: Packet) => {
    sound.playClick();
    setSelectedPacket(packet.id);
    
    // Get click coordinates relative to the viewport
    const x = e.clientX;
    const y = e.clientY;
    
    setContextMenu({ x, y, streamId: packet.streamId });
  };

  const handleFollowStream = () => {
    if (!contextMenu) return;
    sound.playClick();
    setActiveModal(contextMenu.streamId);
    setContextMenu(null);
  };

  const closeMenu = () => {
    if (contextMenu) setContextMenu(null);
  };

  const handleExtract = () => {
    sound.playSuccess();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#a258ff', '#ffffff'] });
    setActiveModal(null);
    setPhase('WON');
  };

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] m13-container" onClick={closeMenu}>
      
      {/* HUD */}
      <div className="m13-hud">
        <div className="m13-hud-title">Wireshark &bull; Room 13</div>
        <div className="m13-hud-controls flex items-center gap-4">
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
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Crossed Wires</h2>
          <p className="text-[#a258ff] text-xs uppercase tracking-[0.2em] mb-6">Wireshark Simulator</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>You have intercepted network traffic from the Obsidian Vault. The credentials are in here somewhere.</p>
            <p><strong>Your Task:</strong></p>
            <ol className="list-decimal text-left inline-block max-w-sm">
              <li className="ml-4">Analyze the packet list.</li>
              <li className="ml-4">Click on a suspicious packet.</li>
              <li className="ml-4">Select <strong className="text-white">Follow TCP Stream</strong>.</li>
              <li className="ml-4">Find the cleartext HTTP stream to extract the password.</li>
            </ol>
            <p className="text-xs text-[#ef4444] mt-2">Warning: Do not waste time trying to read encrypted HTTPS traffic.</p>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#a258ff]/10 border border-[#a258ff]/50 text-[#a258ff] rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff]/20 hover:border-[#a258ff] transition-all cursor-pointer text-sm">
            Open Capture
          </button>
        </div>
      )}

      {/* ── PLAYING PHASE ── */}
      {phase === 'PLAYING' && (
        <div className="m13-capture-window">
          
          <div className="m13-toolbar">
            <div className="m13-toolbar-btn"><Activity className="w-4 h-4" /> Start</div>
            <div className="m13-toolbar-btn"><ShieldAlert className="w-4 h-4" /> Stop</div>
          </div>
          <div className="m13-filter-bar">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Filter:</span>
            <input type="text" className="m13-filter-input" value="tcp.port in {80, 443}" readOnly />
          </div>

          <div className="m13-grid-header">
            <div>No.</div>
            <div>Source</div>
            <div>Destination</div>
            <div>Protocol</div>
            <div>Info</div>
          </div>

          <div className="m13-grid-body">
            {PACKETS.map(p => (
              <div 
                key={p.id}
                className={`m13-packet-row ${p.protoClass} ${selectedPacket === p.id ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); handlePacketClick(e, p); }}
              >
                <div>{p.no}</div>
                <div>{p.source}</div>
                <div>{p.dest}</div>
                <div>{p.proto}</div>
                <div>{p.info}</div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {contextMenu && (
        <div 
          className="m13-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="m13-menu-item" onClick={handleFollowStream}>
            <Search className="w-3 h-3" /> Follow TCP Stream
          </div>
        </div>
      )}

      {/* ── STREAM MODAL ── */}
      {activeModal && (
        <div className="m13-modal-overlay">
          <div className="m13-modal">
            <div className="m13-modal-header">
              <div className="m13-modal-title">Follow TCP Stream</div>
              <div className="m13-modal-close" onClick={() => { sound.playClick(); setActiveModal(null); }}><X className="w-4 h-4"/></div>
            </div>
            <div className="m13-modal-body">
              {activeModal === 'stream0' ? STREAM_CONTENTS.stream0.content : STREAM_CONTENTS.stream1.content}
            </div>
            <div className="m13-modal-footer">
              {activeModal === 'stream0' ? (
                <button className="m13-extract-btn" onClick={handleExtract}>
                  <Unlock className="w-4 h-4" /> Extract Credentials
                </button>
              ) : (
                <div className="text-[#ef4444] text-xs flex items-center gap-2 font-bold uppercase">
                  <Lock className="w-4 h-4" /> Ciphertext Unreadable
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WON ── */}
      {phase === 'WON' && (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
            <Unlock className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Credentials Extracted</h2>
          <p className="text-[#10b981]/60 text-xs uppercase tracking-[0.2em] mb-6">Cleartext Payload Discovered</p>
          <div className="bg-[#1a0b2e] border border-[#10b981]/30 p-4 rounded-lg mb-8 max-w-sm w-full text-center">
            <div className="text-[#10b981] font-mono text-sm">username: <span className="text-white font-bold">admin</span></div>
            <div className="text-[#10b981] font-mono text-sm mt-2">password: <span className="text-white font-bold">blackout2026</span></div>
          </div>
          <p className="text-[#10b981]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            You successfully used Wireshark's Follow Stream feature to identify the unencrypted HTTP traffic and extract the login credentials.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 transition-all cursor-pointer text-sm">
            Analyze Capture Again
          </button>
        </div>
      )}

    </div>
  );
}
