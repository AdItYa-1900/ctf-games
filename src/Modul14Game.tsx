import { useState, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import { Volume2, VolumeX, Globe, Server, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index14game.css';

/* ─── Types & Data ──────────────────────────────────────── */

type GamePhase = 'START' | 'PLAYING' | 'WON';
type RecordType = 'A' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'AXFR';

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

export default function Modul14Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [recordType, setRecordType] = useState<RecordType>('A');
  const [target] = useState('blackout-control.net');
  const [serverStr, setServerStr] = useState('');
  
  const [outputLines, setOutputLines] = useState<React.ReactNode[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const queryTimeoutRef = useRef<number | null>(null);

  const startGame = useCallback(() => {
    setOutputLines([]);
    setServerStr('');
    setRecordType('A');
    setIsQuerying(false);
    setPhase('PLAYING');
  }, []);

  const handleWin = () => {
    sound.playSuccess();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#a258ff', '#ffffff'] });
    setPhase('WON');
  };

  const executeQuery = (e: FormEvent) => {
    e.preventDefault();
    if (isQuerying) return;
    
    if (queryTimeoutRef.current) clearTimeout(queryTimeoutRef.current);
    
    setIsQuerying(true);
    sound.playKeystroke(); 
    
    const linesToPrint: React.ReactNode[] = [];
    const serverPart = serverStr.trim() ? `@${serverStr.trim()}` : '';
    const cmdStr = `dig ${recordType !== 'A' ? recordType + ' ' : ''}${target} ${serverPart}`.trim();
    
    linesToPrint.push(<span className="m14-out-cmd">root@sentinel:~# {cmdStr}</span>);
    linesToPrint.push(<br/>);
    linesToPrint.push(<span className="m14-out-comment">; &lt;&lt;&gt;&gt; DiG 9.16.1-Ubuntu &lt;&lt;&gt;&gt; {recordType !== 'A' ? recordType + ' ' : ''}{target} {serverPart}</span>);
    linesToPrint.push(<span className="m14-out-comment">;; global options: +cmd</span>);
    linesToPrint.push(<span className="m14-out-comment">;; Got answer:</span>);
    linesToPrint.push(<span className="m14-out-comment">;; -&gt;&gt;HEADER&lt;&lt;- opcode: QUERY, status: NOERROR, id: {Math.floor(Math.random()*60000)}</span>);
    linesToPrint.push(<br/>);

    const s = serverStr.trim().toLowerCase();

    if (recordType === 'AXFR') {
      if (s === 'ns1.blackout-control.net') {
        // SUCCESSFUL ZONE TRANSFER
        linesToPrint.push(<span className="m14-out-comment">;; XFR size: 8 records (messages 1, bytes 245)</span>);
        linesToPrint.push(<br/>);
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN SOA ns1.{target}. admin.{target}.</span>);
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN NS ns1.{target}.</span>);
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.25</span></span>);
        linesToPrint.push(<span><span className="m14-out-domain">mail.{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.26</span></span>);
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN MX 10 mail.{target}.</span>);
        linesToPrint.push(<span><span className="m14-out-domain">dev.{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.40</span></span>);
        linesToPrint.push(<span><span className="m14-out-domain">vpn.{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.45</span></span>);
        
        // The winning record
        linesToPrint.push(
          <span className="flex items-center">
            <span className="m14-out-domain">vault.{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.99</span>
            <button className="m14-extract-btn" onClick={handleWin}>Extract Target</button>
          </span>
        );
      } else {
        // FAILED ZONE TRANSFER
        linesToPrint.push(<span className="m14-out-error">;; Transfer failed.</span>);
        linesToPrint.push(<span className="m14-out-comment">;; Connection refused or zone transfer not allowed by {s || 'default resolver'}.</span>);
        sound.playError();
      }
    } else {
      // Normal Queries
      linesToPrint.push(<span className="m14-out-comment">;; ANSWER SECTION:</span>);
      
      if (recordType === 'A') {
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN A <span className="m14-out-ip">198.51.100.25</span></span>);
      } else if (recordType === 'MX') {
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN MX 10 mail.{target}.</span>);
      } else if (recordType === 'NS') {
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN NS ns1.{target}.</span>);
      } else if (recordType === 'TXT') {
        linesToPrint.push(<span><span className="m14-out-domain">{target}.</span> 3600 IN TXT "v=spf1 include:_spf.google.com ~all"</span>);
      } else if (recordType === 'CNAME') {
        linesToPrint.push(<span className="m14-out-comment">;; (No CNAME records found for {target})</span>);
      }
    }

    linesToPrint.push(<br/>);
    linesToPrint.push(<span className="m14-out-comment">;; Query time: {Math.floor(Math.random()*40 + 10)} msec</span>);
    if (s) {
      linesToPrint.push(<span className="m14-out-comment">;; SERVER: {s}#53({s})</span>);
    }
    linesToPrint.push(<br/>);

    // Animation Logic
    setOutputLines([]);
    let lineIdx = 0;
    
    const printNextLine = () => {
      if (lineIdx < linesToPrint.length) {
        sound.playKeystroke();
        setOutputLines(prev => [...prev, linesToPrint[lineIdx]]);
        lineIdx++;
        queryTimeoutRef.current = window.setTimeout(printNextLine, 50 + Math.random() * 50);
      } else {
        setIsQuerying(false);
      }
    };

    printNextLine();
  };

  return (
    <div className="relative w-full max-w-5xl rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] m14-container">
      
      {/* HUD */}
      <div className="m14-hud">
        <div className="m14-hud-title">DNS Recon &bull; Room 14</div>
        <div className="m14-hud-controls flex items-center gap-4">
          <button onClick={() => { const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#1a0b2e] transition cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#64748b]" /> : <Volume2 className="w-4 h-4 text-[#64748b]" />}
          </button>
        </div>
      </div>

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#a258ff]/20 to-[#10b981]/10 border border-[#a258ff]/30 flex items-center justify-center">
            <Globe className="w-10 h-10 text-[#a258ff]" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Zone Transfer</h2>
          <p className="text-[#a258ff] text-xs uppercase tracking-[0.2em] mb-6">DNS Reconnaissance</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>Intelligence suggests Obsidian operates a hidden vault subdomain under <strong className="text-white">blackout-control.net</strong>.</p>
            <p><strong>Your Mission:</strong></p>
            <ol className="list-decimal text-left inline-block max-w-[320px]">
              <li className="ml-4">Use the query builder to find the domain's authoritative Name Server (NS).</li>
              <li className="ml-4">Target that Name Server directly.</li>
              <li className="ml-4">Execute a Zone Transfer (AXFR) to dump the entire DNS zone file.</li>
              <li className="ml-4">Locate and extract the hidden vault subdomain.</li>
            </ol>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#a258ff]/10 border border-[#a258ff]/50 text-[#a258ff] rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff]/20 hover:border-[#a258ff] transition-all cursor-pointer text-sm">
            Launch Query Tool
          </button>
        </div>
      )}

      {/* ── PLAYING PHASE ── */}
      {phase === 'PLAYING' && (
        <div className="m14-layout">
          
          {/* Query Builder Sidebar */}
          <form className="m14-sidebar" onSubmit={executeQuery}>
            <div className="m14-panel-header">dig Query Builder</div>
            
            <div className="m14-form-group">
              <label className="m14-label">Record Type</label>
              <select 
                className="m14-select" 
                value={recordType} 
                onChange={e => setRecordType(e.target.value as RecordType)}
                disabled={isQuerying}
              >
                <option value="A">A (IPv4 Address)</option>
                <option value="MX">MX (Mail Exchange)</option>
                <option value="TXT">TXT (Text Record)</option>
                <option value="NS">NS (Name Server)</option>
                <option value="CNAME">CNAME (Canonical Name)</option>
                <option value="AXFR">AXFR (Zone Transfer)</option>
              </select>
            </div>

            <div className="m14-form-group">
              <label className="m14-label">Target Domain</label>
              <input 
                type="text" 
                className="m14-input" 
                value={target} 
                disabled 
                readOnly
              />
            </div>

            <div className="m14-form-group">
              <label className="m14-label flex items-center justify-between">
                <span>DNS Server (Optional)</span>
                <Server className="w-3 h-3" />
              </label>
              <input 
                type="text" 
                className="m14-input" 
                placeholder="e.g. ns1.example.com"
                value={serverStr}
                onChange={e => setServerStr(e.target.value)}
                disabled={isQuerying}
              />
            </div>

            <div className="m14-query-preview">
              &gt; dig {recordType !== 'A' ? recordType + ' ' : ''}{target} {serverStr.trim() ? `@${serverStr.trim()}` : ''}
            </div>

            <button type="submit" className="m14-btn-execute" disabled={isQuerying}>
              {isQuerying ? 'Querying...' : 'Execute Query'}
            </button>
          </form>

          {/* Terminal Area */}
          <div className="m14-terminal flex flex-col relative">
            <div className="m14-term-header">
              <div className="m14-term-dots">
                <div className="m14-term-dot r"></div>
                <div className="m14-term-dot y"></div>
                <div className="m14-term-dot g"></div>
              </div>
              <div className="m14-term-title">bash — dig</div>
            </div>

            <div className="m14-term-body">
              {outputLines.length === 0 && !isQuerying && (
                <div className="text-slate-500 italic">Configure query and click Execute...</div>
              )}
              
              {outputLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line}
                </div>
              ))}
              
              {isQuerying && (
                <div><span className="m14-cursor"></span></div>
              )}
              
              {!isQuerying && outputLines.length > 0 && (
                <div className="mt-4 text-[#10b981] font-bold">root@sentinel:~# <span className="m14-cursor"></span></div>
              )}
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
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">Vault Discovered</h2>
          <p className="text-[#10b981]/60 text-xs uppercase tracking-[0.2em] mb-6">Zone Transfer Successful</p>
          <div className="bg-[#1a0b2e] border border-[#10b981]/30 p-4 rounded-lg mb-8 max-w-sm w-full text-center">
            <div className="text-[#10b981] font-mono text-sm">Target Acquired:</div>
            <div className="text-white font-bold text-lg font-mono mt-2">vault.blackout-control.net</div>
          </div>
          <p className="text-[#10b981]/70 max-w-md text-center leading-relaxed mb-8 text-sm font-sans">
            You successfully identified the authoritative Name Server and executed a zone transfer. The misconfigured server dumped its entire directory, revealing the hidden infrastructure.
          </p>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981]/10 border border-[#10b981]/50 text-[#10b981] rounded-lg font-bold uppercase tracking-widest hover:bg-[#10b981]/20 transition-all cursor-pointer text-sm">
            Restart Recon
          </button>
        </div>
      )}

    </div>
  );
}
