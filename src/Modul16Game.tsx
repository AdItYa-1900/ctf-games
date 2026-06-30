import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Server, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index16game.css';

/* ─── Types & Data ──────────────────────────────────────── */

type GamePhase = 'START' | 'PLAYING' | 'WON';
type PacketState = 'HIDDEN' | 'SENDING' | 'CAUGHT' | 'FORWARDING' | 'DROPPING';

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
  playSend() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(400, c.currentTime); o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.2); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2); } catch {}
  }
  playIntercept() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1200, c.currentTime); o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.3); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3); } catch {}
  }
  playDrop() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(200, c.currentTime); o.frequency.exponentialRampToValueAtTime(20, c.currentTime + 0.4); g.gain.setValueAtTime(0.1, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.4); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4); } catch {}
  }
  playType() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1500 + Math.random()*500, c.currentTime); g.gain.setValueAtTime(0.01, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.03); } catch {}
  }
  playSuccess() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(440, c.currentTime); o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.2); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4); } catch {}
  }
  playError() {
    if (this.isMuted) return;
    try { const c = this.init(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, c.currentTime); o.frequency.linearRampToValueAtTime(80, c.currentTime + 0.3); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.3); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3); } catch {}
  }
  playWin() {
    if (this.isMuted) return;
    try { const c = this.init(), now = c.currentTime; [440, 554.37, 659.25, 880].forEach((f, i) => { const t = now + i * 0.15; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.5); }); } catch {}
  }
}

const sound = new SoundManager();

/* ─── Component ─────────────────────────────────────────── */

export default function Modul16Game() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  // Game State
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [briefingActive, setBriefingActive] = useState(true);
  
  // Proxy State
  const [interceptOn, setInterceptOn] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [typedRequest, setTypedRequest] = useState<string>('');
  
  // Visuals State
  const [packetState, setPacketState] = useState<PacketState>('HIDDEN');
  
  // App State
  const [appStatus, setAppStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [appMessage, setAppMessage] = useState('');

  // Typewriter effect ref
  const typingIntervalRef = useRef<number | null>(null);

  // Level 3 Timer (The Ghost)
  useEffect(() => {
    if (level === 3 && !briefingActive && appStatus === 'IDLE' && packetState === 'HIDDEN') {
      const timer = setTimeout(() => {
        triggerRequest();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [level, briefingActive, appStatus, packetState]);

  const startGame = () => {
    setLevel(1);
    setBriefingActive(true);
    setInterceptOn(false);
    setPendingRequest(null);
    setTypedRequest('');
    setPacketState('HIDDEN');
    setAppStatus('IDLE');
    setPhase('PLAYING');
  };

  const nextLevel = () => {
    if (level === 5) {
      sound.playWin();
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#8b5cf6', '#10b981', '#ffffff'] });
      setPhase('WON');
    } else {
      setLevel((level + 1) as 1 | 2 | 3 | 4 | 5);
      setBriefingActive(true);
      setPendingRequest(null);
      setTypedRequest('');
      setPacketState('HIDDEN');
      setAppStatus('IDLE');
    }
  };

  /* ─── Typewriter Effect ─── */
  const startTypewriter = (fullText: string) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    let i = 0;
    setTypedRequest('');
    
    typingIntervalRef.current = window.setInterval(() => {
      setTypedRequest(fullText.substring(0, i + 1));
      if (i % 3 === 0) sound.playType();
      i++;
      if (i >= fullText.length) {
        clearInterval(typingIntervalRef.current!);
      }
    }, 15); // very fast typing
  };

  const stopTypewriter = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      if (pendingRequest) setTypedRequest(pendingRequest);
    }
  };

  /* ─── App Logic ─── */
  const triggerRequest = () => {
    if (appStatus === 'LOADING') return;

    sound.playSend();
    setPacketState('SENDING');
    setAppStatus('LOADING');

    setTimeout(() => {
      if (!interceptOn) {
        // Bypass proxy completely (auto forward to server)
        setPacketState('FORWARDING');
        setTimeout(() => {
          setPacketState('HIDDEN');
          if (level === 1) {
            sound.playSuccess();
            setAppStatus('SUCCESS');
            setAppMessage('Ping successful! (But you missed it in the proxy).');
          } else if (level === 2) {
            sound.playError();
            setAppStatus('ERROR');
            setAppMessage('Access Denied. Internal role required.');
          } else if (level === 3) {
            sound.playError();
            setAppStatus('ERROR');
            setAppMessage('ALARM TRIGGERED! Network locked down.');
          } else if (level === 4) {
            sound.playSuccess();
            setAppStatus('SUCCESS');
            setAppMessage('Profile loaded. (ID: 409 - Standard User).');
          } else if (level === 5) {
            sound.playError();
            setAppStatus('ERROR');
            setAppMessage('ACCESS DENIED: External IP rejected.');
          }
        }, 400);
        return;
      }

      // Intercepted
      sound.playIntercept();
      setPacketState('CAUGHT');
      
      let rawReq = '';
      if (level === 1) {
        rawReq = 
`GET /ping HTTP/1.1
Host: api.obsidian.net
User-Agent: Mozilla/5.0
Accept: */*

`;
      } else if (level === 2) {
        rawReq = 
`POST /auth/login HTTP/1.1
Host: portal.obsidian.net
Content-Type: application/x-www-form-urlencoded

<!-- TODO: remove debug override before prod: admin_bypass=true -->
username=guest&password=***`;
      } else if (level === 3) {
        rawReq = 
`POST /api/security-alarm HTTP/1.1
Host: internal.obsidian.net
Content-Type: application/json

{"threat_detected": true, "ip": "198.51.100.4"}`;
      } else if (level === 4) {
        rawReq = 
`GET /api/profile?id=409 HTTP/1.1
Host: internal.obsidian.net
Cookie: session=eyJhbGciOiJIUzI1NiJ9

`;
      } else if (level === 5) {
        rawReq = 
`POST /mainframe/auth HTTP/1.1
Host: core.obsidian.net
Content-Type: application/json

{"command": "grant_root_access"}`;
      }
      
      setPendingRequest(rawReq);
      startTypewriter(rawReq);

    }, 400); // Send animation duration
  };

  /* ─── Proxy Logic ─── */
  const handleForward = () => {
    if (!pendingRequest || packetState !== 'CAUGHT') return;
    
    stopTypewriter();
    sound.playSend();
    setPacketState('FORWARDING');
    
    // We check `typedRequest` which is what the user actually edited
    const req = typedRequest;
    setPendingRequest(null);
    setTypedRequest('');

    setTimeout(() => {
      setPacketState('HIDDEN');
      if (level === 1) {
        sound.playSuccess();
        setAppStatus('SUCCESS');
        setAppMessage('Request Forwarded! Ping successful.');
        setTimeout(nextLevel, 2500);
      } 
      else if (level === 2) {
        if (req.includes('admin_bypass=true')) {
          sound.playSuccess();
          setAppStatus('SUCCESS');
          setAppMessage('Bypass Accepted. Welcome to the Core, Admin.');
          setTimeout(nextLevel, 3000);
        } else {
          sound.playError();
          setAppStatus('ERROR');
          setAppMessage('Access Denied: Missing override permissions.');
          setTimeout(() => setAppStatus('IDLE'), 2000);
        }
      }
      else if (level === 3) {
        sound.playError();
        setAppStatus('ERROR');
        setAppMessage('ALARM REACHED SERVER! Mission Failed.');
        setTimeout(() => setAppStatus('IDLE'), 2000);
      }
      else if (level === 4) {
        if (req.includes('id=1 ')) {
          sound.playSuccess();
          setAppStatus('SUCCESS');
          setAppMessage('Profile loaded. (ID: 1 - CEO). Target acquired.');
          setTimeout(nextLevel, 3000);
        } else {
          sound.playError();
          setAppStatus('ERROR');
          setAppMessage('Profile loaded. (Standard User). Not the target.');
          setTimeout(() => setAppStatus('IDLE'), 2000);
        }
      }
      else if (level === 5) {
        if (req.toLowerCase().includes('x-forwarded-for: 127.0.0.1')) {
          sound.playSuccess();
          setAppStatus('SUCCESS');
          setAppMessage('Localhost spoofed. MAINFRAME UNLOCKED.');
          setTimeout(nextLevel, 3000);
        } else {
          sound.playError();
          setAppStatus('ERROR');
          setAppMessage('ACCESS DENIED: External IP rejected.');
          setTimeout(() => setAppStatus('IDLE'), 2000);
        }
      }
    }, 400); // Forward animation duration
  };

  const handleDrop = () => {
    if (!pendingRequest || packetState !== 'CAUGHT') return;
    
    stopTypewriter();
    sound.playDrop();
    setPacketState('DROPPING');
    
    setPendingRequest(null);
    setTypedRequest('');

    setTimeout(() => {
      setPacketState('HIDDEN');
      if (level === 3) {
        sound.playSuccess();
        setAppStatus('SUCCESS');
        setAppMessage('Alarm shattered. Connection secure.');
        setTimeout(nextLevel, 2500);
      } else {
        setAppStatus('ERROR');
        setAppMessage('Request destroyed by proxy.');
        setTimeout(() => setAppStatus('IDLE'), 2000);
      }
    }, 500); // Shatter animation duration
  };

  /* ─── Renders ─── */
  const renderBriefing = () => {
    if (level === 1) {
      return (
        <div className="m16-briefing">
          <div className="m16-briefing-content">
            <h3 className="text-2xl font-bold text-white mb-2">Level 1: The Catch</h3>
            <p className="text-slate-400 mb-6 font-mono text-sm">Learn to manipulate the data stream.</p>
            <div className="text-left bg-[#020617] p-4 rounded border border-slate-700 text-sm space-y-3 text-slate-300">
              <p>When the Proxy Interceptor is <strong className="text-red-400">ON</strong>, data packets are caught before they reach the server.</p>
              <ol className="list-decimal ml-5">
                <li>Toggle <strong className="text-red-400">Intercept ON</strong>.</li>
                <li>Click "Ping Server" to fire a data packet.</li>
                <li>Watch the packet freeze in the proxy.</li>
                <li>Click <strong className="text-emerald-400">Forward</strong> to send it to the server.</li>
              </ol>
            </div>
            <button onClick={() => setBriefingActive(false)} className="mt-6 px-6 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0f172a] rounded font-bold uppercase tracking-widest">Start Level</button>
          </div>
        </div>
      );
    }
    if (level === 2) {
      return (
        <div className="m16-briefing">
          <div className="m16-briefing-content">
            <h3 className="text-2xl font-bold text-white mb-2">Level 2: The Override</h3>
            <p className="text-slate-400 mb-6 font-mono text-sm">You control the traffic.</p>
            <div className="text-left bg-[#020617] p-4 rounded border border-slate-700 text-sm space-y-3 text-slate-300">
              <p>Developers often leave hidden comments or debug parameters in web requests. The proxy reveals everything.</p>
              <ol className="list-decimal ml-5">
                <li>Catch the login request.</li>
                <li>Read the raw HTTP text as it streams into the proxy.</li>
                <li>Look for a hidden debug parameter.</li>
                <li><strong className="text-yellow-400">Manually type</strong> that exact parameter into the HTTP body, then Forward it.</li>
              </ol>
            </div>
            <button onClick={() => setBriefingActive(false)} className="mt-6 px-6 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0f172a] rounded font-bold uppercase tracking-widest">Start Level</button>
          </div>
        </div>
      );
    }
    if (level === 3) {
      return (
        <div className="m16-briefing">
          <div className="m16-briefing-content">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Level 3: The Ghost</h3>
            <p className="text-[#8b5cf6] mb-6 font-mono text-sm">Silence the alarms.</p>
            <div className="text-left bg-[#020005] p-5 rounded border border-[#8b5cf6]/30 text-sm space-y-3 text-slate-300">
              <p>You have accessed the internal network, but an automated security scan has spotted you. It is preparing to fire a webhook alarm.</p>
              <ol className="list-decimal ml-5 space-y-2">
                <li>Turn Intercept <strong className="text-red-400">ON</strong> immediately.</li>
                <li>Wait for the automated system to fire the <code className="text-yellow-400">/security-alarm</code> request.</li>
                <li>When it enters the proxy, click <strong className="text-red-500">Drop</strong> to shatter the packet and prevent the server from receiving it.</li>
              </ol>
            </div>
            <button onClick={() => setBriefingActive(false)} className="mt-8 px-8 py-3 bg-[#8b5cf6] hover:bg-[#a258ff] text-white rounded font-bold uppercase tracking-widest transition-all">Start Level</button>
          </div>
        </div>
      );
    }
    if (level === 4) {
      return (
        <div className="m16-briefing">
          <div className="m16-briefing-content">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Level 4: The Identity (IDOR)</h3>
            <p className="text-[#8b5cf6] mb-6 font-mono text-sm">Insecure Direct Object Reference.</p>
            <div className="text-left bg-[#020005] p-5 rounded border border-[#8b5cf6]/30 text-sm space-y-3 text-slate-300">
              <p>You need intel on Obsidian's CEO, but you only have standard user access (ID: 409). The server fetches profiles based on the URL parameter.</p>
              <ol className="list-decimal ml-5 space-y-2">
                <li>Intercept the request to view your profile.</li>
                <li>Find the parameter <code className="text-yellow-400">id=409</code> in the GET request.</li>
                <li>Change it to <code className="text-emerald-400">id=1</code> to pull the CEO's profile instead.</li>
              </ol>
            </div>
            <button onClick={() => setBriefingActive(false)} className="mt-8 px-8 py-3 bg-[#8b5cf6] hover:bg-[#a258ff] text-white rounded font-bold uppercase tracking-widest transition-all">Start Level</button>
          </div>
        </div>
      );
    }
    if (level === 5) {
      return (
        <div className="m16-briefing">
          <div className="m16-briefing-content">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Level 5: The Spoof</h3>
            <p className="text-[#8b5cf6] mb-6 font-mono text-sm">HTTP Header Injection.</p>
            <div className="text-left bg-[#020005] p-5 rounded border border-[#8b5cf6]/30 text-sm space-y-3 text-slate-300">
              <p>You have reached the core Mainframe, but it blocks all external connections. It only trusts requests from the internal localhost IP.</p>
              <ol className="list-decimal ml-5 space-y-2">
                <li>Intercept the Mainframe Access request.</li>
                <li>You must manually inject a new HTTP Header into the raw text.</li>
                <li>Type <code className="text-yellow-400">X-Forwarded-For: 127.0.0.1</code> into the headers section to spoof an internal connection.</li>
              </ol>
            </div>
            <button onClick={() => setBriefingActive(false)} className="mt-8 px-8 py-3 bg-[#8b5cf6] hover:bg-[#a258ff] text-white rounded font-bold uppercase tracking-widest transition-all">Start Level</button>
          </div>
        </div>
      );
    }
  };

  const renderWebApp = () => {
    if (level === 1) {
      return (
        <div className="m16-webapp">
          <div className="m16-webapp-logo">OBSIDIAN</div>
          <div className="m16-webapp-box">
            <h2 className="m16-webapp-title">Network Diagnostics</h2>
            {appStatus === 'LOADING' ? (
              <div className="text-center">
                <div className="m16-spinner mb-3"></div>
                <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Transmitting</div>
              </div>
            ) : appStatus === 'SUCCESS' ? (
              <div className="text-emerald-400 text-center font-bold">{appMessage}</div>
            ) : appStatus === 'ERROR' ? (
              <div className="text-red-500 text-center font-bold">{appMessage}</div>
            ) : (
              <button className="m16-webapp-btn" onClick={triggerRequest}>Ping Server</button>
            )}
          </div>
        </div>
      );
    }
    if (level === 2) {
      return (
        <div className="m16-webapp">
          <div className="m16-webapp-logo">OBSIDIAN</div>
          <div className="m16-webapp-box">
            <h2 className="m16-webapp-title"><Lock className="w-5 h-5 inline mr-2 align-text-bottom text-red-500"/>Employee Portal</h2>
            {appStatus === 'LOADING' ? (
              <div className="text-center">
                <div className="m16-spinner mb-3"></div>
                <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Authenticating</div>
              </div>
            ) : appStatus === 'SUCCESS' ? (
              <div className="text-emerald-400 text-center font-bold">{appMessage}</div>
            ) : appStatus === 'ERROR' ? (
              <>
                <div className="text-red-500 text-center font-bold mb-4">{appMessage}</div>
                <button className="m16-webapp-btn bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:shadow-none" onClick={() => setAppStatus('IDLE')}>Try Again</button>
              </>
            ) : (
              <>
                <input type="text" className="m16-webapp-input" value="guest" disabled />
                <input type="password" className="m16-webapp-input" value="***" disabled />
                <button className="m16-webapp-btn" onClick={triggerRequest}>Secure Login</button>
              </>
            )}
          </div>
        </div>
      );
    }
    if (level === 3) {
      return (
        <div className="m16-webapp">
          <div className="m16-webapp-logo" style={{color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.5)'}}>OBSIDIAN // CORE</div>
          <div className="m16-webapp-box border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <h2 className="m16-webapp-title text-red-500"><AlertTriangle className="w-5 h-5 inline mr-2 align-text-bottom"/>Security Scan</h2>
            {appStatus === 'LOADING' ? (
              <div className="text-center text-slate-400">
                <div className="m16-spinner border-t-red-500 mb-3"></div>
                <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Dispatching Alarm Payload</div>
              </div>
            ) : appStatus === 'SUCCESS' ? (
              <div className="text-emerald-400 text-center font-bold">{appMessage}</div>
            ) : appStatus === 'ERROR' ? (
              <>
                <div className="text-red-500 text-center font-bold mb-4">{appMessage}</div>
                <button className="m16-webapp-btn bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:shadow-none" onClick={() => setAppStatus('IDLE')}>Restart Level</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-4">Threat detected in sector 4. Automated alarm will trigger in <strong className="text-white">4 seconds</strong>...</p>
                <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
                  <div className="bg-red-500 h-full w-full animate-[shrink_4s_linear]"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (level === 4) {
      return (
        <div className="m16-webapp">
          <div className="m16-webapp-logo" style={{color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.5)'}}>OBSIDIAN // HR</div>
          <div className="m16-webapp-box">
            <h2 className="m16-webapp-title text-red-500">Personnel Records</h2>
            {appStatus === 'LOADING' ? (
              <div className="text-center">
                <div className="m16-spinner mb-3"></div>
                <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Fetching Profile</div>
              </div>
            ) : appStatus === 'SUCCESS' ? (
              <div className="text-emerald-400 text-center font-bold">{appMessage}</div>
            ) : appStatus === 'ERROR' ? (
              <>
                <div className="text-red-500 text-center font-bold mb-4">{appMessage}</div>
                <button className="m16-webapp-btn bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:shadow-none" onClick={() => setAppStatus('IDLE')}>Try Again</button>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-950 border border-red-500 rounded-full mx-auto mb-4 flex items-center justify-center text-red-500 font-bold">409</div>
                <p className="text-sm text-slate-300 mb-4">Logged in as Standard User.</p>
                <button className="m16-webapp-btn" onClick={triggerRequest}>View My Profile</button>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (level === 5) {
      return (
        <div className="m16-webapp">
          <div className="m16-webapp-logo" style={{color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.5)'}}>OBSIDIAN // MAINFRAME</div>
          <div className="m16-webapp-box">
            <h2 className="m16-webapp-title text-red-500"><Server className="w-5 h-5 inline mr-2 align-text-bottom"/>Core Access</h2>
            {appStatus === 'LOADING' ? (
              <div className="text-center">
                <div className="m16-spinner mb-3"></div>
                <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Authenticating IP</div>
              </div>
            ) : appStatus === 'SUCCESS' ? (
              <div className="text-emerald-400 text-center font-bold">{appMessage}</div>
            ) : appStatus === 'ERROR' ? (
              <>
                <div className="text-red-500 text-center font-bold mb-4">{appMessage}</div>
                <button className="m16-webapp-btn bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:shadow-none" onClick={() => setAppStatus('IDLE')}>Try Again</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-4">This terminal requires an internal localhost connection.</p>
                <button className="m16-webapp-btn" onClick={triggerRequest}>Request Root Access</button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative w-full max-w-[1400px] m16-container">
      
      {/* Ambient floating dust particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`p-${i}`}
          className="m16-particle"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${-10 + Math.random() * 40}%`,
            animationDuration: `${5 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
          }}
        />
      ))}

      {/* HUD */}
      <div className="m16-hud">
        <div className="m16-hud-title">Proxy in the Middle &bull; Level {level}</div>
        <div className="m16-hud-controls flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); const n = !isMuted; setIsMuted(n); sound.setMute(n); }} className="p-2 rounded hover:bg-[#1a0b2e] transition cursor-pointer border border-[#334155]">
            {isMuted ? <VolumeX className="w-4 h-4 text-[#94a3b8]" /> : <Volume2 className="w-4 h-4 text-[#94a3b8]" />}
          </button>
        </div>
      </div>

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#8b5cf6]/5 border border-[#8b5cf6]/30 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <Server className="w-10 h-10 text-[#8b5cf6]" />
          </div>
          <h2 className="text-4xl font-bold text-white uppercase tracking-widest mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>The Interceptor</h2>
          <p className="text-[#8b5cf6] text-xs uppercase tracking-[0.2em] mb-6">Proxy Simulation</p>
          <div className="text-slate-400 max-w-lg text-center leading-relaxed mb-8 text-sm font-sans space-y-3">
            <p>You cannot hack what you cannot see.</p>
            <p><strong>Your Mission:</strong></p>
            <ul className="list-disc text-left inline-block max-w-[480px]">
              <li className="ml-4">You have a split-screen workspace. Left is the Target Web App. Right is your Sentinel Proxy.</li>
              <li className="ml-4">Turn <strong className="text-red-400">Intercept ON</strong> to pause data packets before they hit the server.</li>
              <li className="ml-4">You can manually <strong className="text-yellow-400">Modify</strong> the raw HTTP text to exploit hidden developer parameters.</li>
              <li className="ml-4"><strong className="text-emerald-400">Forward</strong> malicious requests, or <strong className="text-red-500">Drop</strong> security alarms.</li>
            </ul>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#8b5cf6] text-white rounded-lg font-bold uppercase tracking-widest hover:bg-[#a258ff] shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Launch Proxy
          </button>
        </div>
      )}

      {/* ── PLAYING PHASE ── */}
      {phase === 'PLAYING' && (
        <>
          {/* ── Data Flow Animations ── */}
          <div className="m16-data-flow-layer">
            <div className="m16-flow-path"></div>
            {packetState !== 'HIDDEN' && (
              <div className={`m16-packet anim-${packetState.toLowerCase()}`}></div>
            )}
          </div>

          <div className="m16-game-layout">
            
            {briefingActive && renderBriefing()}

          {/* LEFT PANEL: Target Web App */}
          <div className="m16-browser-panel">
            <div className="m16-browser-header">
              <div className="m16-browser-dots">
                <div className="m16-browser-dot red"></div>
                <div className="m16-browser-dot yellow"></div>
                <div className="m16-browser-dot green"></div>
              </div>
              <div className="m16-browser-url">
                <Lock className="w-4 h-4 text-red-400" /> https://portal.obsidian.net
              </div>
            </div>
            <div className="m16-browser-content">
              {renderWebApp()}
            </div>
          </div>

          {/* RIGHT PANEL: Sentinel Proxy */}
          <div className={`m16-proxy-panel ${packetState === 'CAUGHT' ? 'proxy-active' : ''}`}>
            <div className="m16-proxy-header">
              <div className="m16-proxy-title">
                Sentinel Proxy <span className="text-slate-500 font-sans text-xs uppercase tracking-widest ml-2">v2.4</span>
              </div>
            </div>
            
            <div className="m16-proxy-toolbar">
              <button 
                className={`m16-proxy-toggle ${interceptOn ? 'active' : ''}`}
                onClick={() => { sound.playClick(); setInterceptOn(!interceptOn); }}
              >
                {interceptOn ? <Pause className="w-4 h-4 icon"/> : <Play className="w-4 h-4 icon"/>}
                Intercept is {interceptOn ? 'ON' : 'OFF'}
              </button>
              
              <div className="w-px h-6 bg-slate-700 mx-2"></div>
              
              <button 
                className={`m16-proxy-btn forward ${pendingRequest && packetState === 'CAUGHT' ? 'ready' : ''}`}
                onClick={handleForward}
                disabled={!pendingRequest || packetState !== 'CAUGHT'}
              >
                Forward
              </button>
              <button 
                className={`m16-proxy-btn drop ${pendingRequest && packetState === 'CAUGHT' ? 'ready' : ''}`}
                onClick={handleDrop}
                disabled={!pendingRequest || packetState !== 'CAUGHT'}
              >
                Drop
              </button>
            </div>

            <div className="m16-proxy-body">
              <div className="m16-proxy-tabs">
                <div className="m16-proxy-tab active">Raw Request</div>
                <div className="m16-proxy-tab">Headers</div>
                <div className="m16-proxy-tab">Params</div>
              </div>
              <div className="m16-proxy-editor-container">
                {pendingRequest || typedRequest ? (
                  <textarea 
                    className="m16-proxy-textarea"
                    value={typedRequest}
                    onChange={(e) => setTypedRequest(e.target.value)}
                    onFocus={stopTypewriter}
                    spellCheck="false"
                  />
                ) : (
                  <div className="m16-proxy-empty">
                    Waiting for traffic...
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* ── WON MODAL ── */}
      {phase === 'WON' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-[#0f172a] border border-[#10b981] flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
            <CheckCircle className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-4xl font-bold text-white uppercase tracking-widest mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Master Interceptor</h2>
          <p className="text-[#10b981] text-xs uppercase tracking-[0.2em] mb-6">Traffic Manipulation Complete</p>
          <div className="bg-[#0f172a] border border-[#10b981]/30 p-6 rounded-lg mb-8 max-w-lg w-full text-center shadow-lg">
            <p className="text-[#f1f5f9] font-mono text-sm leading-relaxed">
              You successfully utilized the proxy to intercept requests, discovered hidden developer comments, forged authentication parameters, and shattered outbound security alarms.
            </p>
          </div>
          <button onClick={startGame} className="px-10 py-3.5 bg-[#10b981] text-slate-900 rounded-lg font-bold uppercase tracking-widest hover:bg-[#34d399] shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Restart Proxy
          </button>
        </div>
      )}

    </div>
  );
}
