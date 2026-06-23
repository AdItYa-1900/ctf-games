import { useState, useEffect } from 'react';
import './index7game.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Globe, Monitor, Search, AlertCircle, ShieldX } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DNSQuery {
  id: number;
  domain: string;
  isFake: boolean;
  timeRemaining: number; // 0 to 100
  status: 'IDLE' | 'WAITING' | 'SUCCESS' | 'ERROR';
}

const ADDRESS_BOOK = [
  { domain: 'google.com', ip: '142.250.183.14' },
  { domain: 'github.com', ip: '140.82.112.4' },
  { domain: 'wikipedia.org', ip: '103.102.166.224' },
  { domain: 'netflix.com', ip: '54.239.28.85' }
];

const FAKE_DOMAINS = [
  'g00gle.com',
  'netflix-free.xyz',
  'github-login.info',
  'fakewebsite123.com'
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('sentinel_sound_muted') === 'true';
  }

  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('sentinel_sound_muted', muted ? 'true' : 'false');
  }

  public getMuted() { return this.isMuted; }

  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  public playError() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  public playWin() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      [349.23, 440.00, 523.25, 659.25].forEach((freq, idx) => {
        const time = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
      });
    } catch {}
  }
}

const sound = new SoundManager();

export default function Modul7Game() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WON' | 'GAMEOVER'>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  const [queries, setQueries] = useState<DNSQuery[]>([
    { id: 1, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
    { id: 2, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
    { id: 3, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
    { id: 4, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' }
  ]);

  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  const WIN_SCORE = 10;

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const startGame = () => {
    sound.playClick();
    setScore(0);
    setLives(3);
    setQueries([
      { id: 1, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
      { id: 2, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
      { id: 3, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' },
      { id: 4, domain: '', isFake: false, timeRemaining: 100, status: 'IDLE' }
    ]);
    setSelectedClient(null);
    setGameState('PLAYING');
  };

  const triggerClientSuccess = (clientId: number) => {
    sound.playSuccess();
    setScore(s => s + 1);
    setQueries(prev => prev.map(q => q.id === clientId ? { ...q, status: 'SUCCESS' } : q));
    
    setTimeout(() => {
      setQueries(prev => prev.map(q => q.id === clientId ? { ...q, status: 'IDLE', domain: '', timeRemaining: 100 } : q));
    }, 1000);
  };

  const triggerClientError = (clientId: number) => {
    sound.playError();
    setLives(l => l - 1);
    setQueries(prev => prev.map(q => q.id === clientId ? { ...q, status: 'ERROR' } : q));
    
    setTimeout(() => {
      setQueries(prev => prev.map(q => q.id === clientId ? { ...q, status: 'IDLE', domain: '', timeRemaining: 100 } : q));
    }, 1000);
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const intervalId = setInterval(() => {
      setQueries(prevQueries => {
        let updated = [...prevQueries];

        // 1. Spawning new queries
        const idleQueries = updated.filter(q => q.status === 'IDLE');
        if (idleQueries.length > 0) {
          const spawnChance = 0.01 + (score * 0.0025);
          if (Math.random() < spawnChance) {
            const randomClient = idleQueries[Math.floor(Math.random() * idleQueries.length)];
            
            // 20% chance to spawn a fake domain
            const spawnFake = Math.random() < 0.2;
            const targetDomain = spawnFake 
              ? FAKE_DOMAINS[Math.floor(Math.random() * FAKE_DOMAINS.length)]
              : ADDRESS_BOOK[Math.floor(Math.random() * ADDRESS_BOOK.length)].domain;

            updated = updated.map(q => q.id === randomClient.id ? { 
              ...q, 
              status: 'WAITING', 
              domain: targetDomain, 
              isFake: spawnFake,
              timeRemaining: 100 
            } : q);
            sound.playClick();
          }
        }

        // 2. Ticking timers
        let lostLife = false;
        updated = updated.map(q => {
          if (q.status === 'WAITING') {
            const decay = 0.2 + (score * 0.03);
            const newTime = q.timeRemaining - decay;
            
            if (newTime <= 0) {
              lostLife = true;
              // If selected, deselect
              if (selectedClient === q.id) setSelectedClient(null);
              return { ...q, status: 'ERROR', timeRemaining: 0 };
            }
            return { ...q, timeRemaining: newTime };
          }
          return q;
        });

        if (lostLife) {
          sound.playError();
          setLives(l => l - 1);
          setTimeout(() => {
            setQueries(curr => curr.map(q => q.status === 'ERROR' && q.timeRemaining <= 0 ? { ...q, status: 'IDLE', domain: '', timeRemaining: 100 } : q));
          }, 1000);
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [gameState, score, selectedClient]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      if (score >= WIN_SCORE) {
        sound.playWin();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#10b981', '#34d399'] });
        setGameState('WON');
      } else if (lives <= 0) {
        setGameState('GAMEOVER');
      }
    }
  }, [score, lives, gameState]);

  const handleResolveAction = (ip: string | 'NXDOMAIN') => {
    if (selectedClient === null) return;
    
    const client = queries.find(q => q.id === selectedClient);
    if (!client || client.status !== 'WAITING') {
      setSelectedClient(null);
      return;
    }

    if (ip === 'NXDOMAIN') {
      if (client.isFake) {
        triggerClientSuccess(client.id);
      } else {
        triggerClientError(client.id); // Dropped a valid domain!
      }
    } else {
      if (client.isFake) {
        triggerClientError(client.id); // Resolved a fake domain!
      } else {
        const correctIp = ADDRESS_BOOK.find(a => a.domain === client.domain)?.ip;
        if (ip === correctIp) {
          triggerClientSuccess(client.id);
        } else {
          triggerClientError(client.id); // Wrong IP
        }
      }
    }
    
    setSelectedClient(null);
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-emerald-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.25)] select-none transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 07 // The DNS Switchboard
        </span>
        <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-emerald-400 cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          
          {(gameState === 'START' || gameState === 'PLAYING') && (
            <motion.div 
              key="playing" 
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left Panel: Education */}
              <div className="lg:col-span-4 space-y-4 text-sm font-sans flex flex-col">
                <div className="bg-[#0d061a] border border-cyber-border p-5 rounded-lg text-slate-300 flex-1 flex flex-col space-y-4">
                  
                  <h2 className="text-emerald-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Search className="w-5 h-5" /> The DNS Switchboard
                  </h2>
                  <p>
                    DNS is the internet's phonebook. It translates human-friendly <strong>Domain Names</strong> into machine-friendly <strong>IP Addresses</strong>.
                  </p>
                  
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-900/40 text-emerald-400 font-bold px-2 py-1 rounded text-xs mt-1 w-20 text-center">Domain</div>
                      <div className="text-xs text-slate-400">Easy to remember names like <code>google.com</code>.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-900/40 text-emerald-400 font-bold px-2 py-1 rounded text-xs mt-1 w-20 text-center">IP Address</div>
                      <div className="text-xs text-slate-400">The actual numerical address on the network (e.g., <code>142.250.183.14</code>).</div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-950/20 rounded-lg">
                    <span className="text-emerald-400 font-bold block mb-1 text-xs uppercase tracking-wider">Your Mission</span>
                    You are the DNS Server!
                    <br/><br/>
                    1. Click a waiting Browser.<br/>
                    2. Look up their requested Domain in your Address Book.<br/>
                    3. Click the matching IP Address to resolve it.<br/>
                    <br/>
                    If the domain is FAKE (e.g., a typo or hacker), click <strong>NXDOMAIN</strong> to block it! Survive 15 requests.
                  </div>

                  {gameState === 'START' && (
                    <div className="mt-auto">
                      <button 
                        onClick={startGame}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      >
                        Boot DNS Server
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Panel: Arcade Game */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-[#05010e] border border-cyber-border rounded-lg flex-1 flex flex-col p-4 relative overflow-hidden">
                  
                  {/* HUD */}
                  <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded mb-4 shadow-md">
                    <div className="flex gap-2 text-xl font-bold font-mono">
                      <span className="text-slate-400">SCORE:</span>
                      <span className="text-emerald-400">{score}/{WIN_SCORE}</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full border-2 ${i < lives ? 'bg-red-500 border-red-400 shadow-[0_0_10px_#ef4444]' : 'bg-slate-800 border-slate-700'}`}></div>
                      ))}
                    </div>
                  </div>

                  {/* Game Area */}
                  <div className="flex-1 grid grid-cols-2 gap-8 relative">
                    
                    {/* Browsers Side */}
                    <div className="flex flex-col justify-around relative z-10 py-4 gap-2">
                      <div className="absolute inset-y-0 right-0 w-px bg-slate-800 border-r border-dashed border-slate-700"></div>
                      
                      {queries.map(q => (
                        <div key={q.id} className="relative w-full pr-8 h-20">
                          
                          {/* Speech Bubble */}
                          <AnimatePresence>
                            {q.status === 'WAITING' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute -top-6 left-12 bg-emerald-900/90 border border-emerald-500 text-white text-[10px] p-1.5 rounded shadow-lg z-20 font-mono whitespace-nowrap"
                              >
                                DNS: {q.domain}
                                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-emerald-900 border-b border-r border-emerald-500 transform rotate-45"></div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <button 
                            onClick={() => {
                              if (q.status === 'WAITING') {
                                sound.playClick();
                                setSelectedClient(q.id);
                              }
                            }}
                            disabled={gameState !== 'PLAYING'}
                            className={`w-full h-full flex items-center gap-3 bg-slate-900 border-2 p-2 rounded-lg transition-all group cursor-pointer
                              ${q.status === 'WAITING' ? (selectedClient === q.id ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-emerald-500 hover:bg-emerald-950/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]') : ''}
                              ${q.status === 'SUCCESS' ? 'border-emerald-500 bg-emerald-950/50' : ''}
                              ${q.status === 'ERROR' ? 'border-red-500 bg-red-950/50' : ''}
                              ${q.status === 'IDLE' ? 'border-slate-800 opacity-30' : ''}
                            `}
                          >
                            <Monitor className={`w-6 h-6 shrink-0
                              ${q.status === 'WAITING' ? (selectedClient === q.id ? 'text-blue-400' : 'text-emerald-400') : ''}
                              ${q.status === 'SUCCESS' ? 'text-emerald-400' : ''}
                              ${q.status === 'ERROR' ? 'text-red-400' : ''}
                              ${q.status === 'IDLE' ? 'text-slate-600' : ''}
                            `} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Browser {q.id}</span>
                              </div>
                              
                              {/* Timer Bar */}
                              {q.status === 'WAITING' && (
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className={`h-full transition-all duration-75 ${q.timeRemaining > 30 ? (selectedClient === q.id ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} 
                                    style={{ width: `${q.timeRemaining}%` }}
                                  ></div>
                                </div>
                              )}
                              {q.status === 'SUCCESS' && <span className="text-[10px] text-emerald-400 font-mono font-bold">IP RETURNED</span>}
                              {q.status === 'ERROR' && <span className="text-[10px] text-red-400 font-mono font-bold">{q.timeRemaining <= 0 ? 'TIMEOUT' : 'DNS ERROR'}</span>}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Server DNS Side */}
                    <div className="flex flex-col relative z-10 pl-2 py-4">
                      
                      <div className="bg-[#0a0514] border border-slate-800 rounded-lg p-3 flex-1 shadow-inner flex flex-col">
                        <div className="flex items-center gap-2 text-slate-400 mb-3 border-b border-slate-800 pb-2">
                          <Globe className="w-4 h-4 text-slate-500" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">DNS Address Book</span>
                        </div>
                        
                        {/* Address Book List (Visual Only) */}
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 mb-4">
                          {ADDRESS_BOOK.map(entry => (
                            <div key={entry.domain} className="flex justify-between text-[10px] font-mono border-b border-slate-800 last:border-0 py-1">
                              <span className="text-emerald-400">{entry.domain}</span>
                              <span className="text-slate-400">{entry.ip}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive IP Buttons */}
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2 text-center">Transmit Resolution</div>
                        <div className="grid grid-cols-1 gap-2 flex-1">
                          {ADDRESS_BOOK.map(entry => (
                            <button
                              key={entry.ip}
                              disabled={selectedClient === null}
                              onClick={() => {
                                sound.playClick();
                                handleResolveAction(entry.ip);
                              }}
                              className={`bg-slate-900 border text-slate-300 p-2 rounded text-xs font-mono transition-all
                                ${selectedClient !== null ? 'border-emerald-500/50 hover:bg-emerald-900/30 hover:border-emerald-400 cursor-pointer' : 'border-slate-800 opacity-50 cursor-not-allowed'}
                              `}
                            >
                              {entry.ip}
                            </button>
                          ))}
                          
                          {/* NXDOMAIN Action */}
                          <button
                            disabled={selectedClient === null}
                            onClick={() => {
                              sound.playClick();
                              handleResolveAction('NXDOMAIN');
                            }}
                            className={`mt-auto flex items-center justify-center gap-2 bg-red-950/40 border p-2 rounded text-xs font-bold uppercase transition-all
                              ${selectedClient !== null ? 'border-red-500 text-red-400 hover:bg-red-900/60 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'}
                            `}
                          >
                            <ShieldX className="w-4 h-4" /> Drop (NXDOMAIN)
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Overlays */}
                  {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center">
                      <div className="bg-emerald-900/20 border border-emerald-500 p-4 rounded text-emerald-400 font-mono text-center max-w-xs text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        Click "Boot DNS Server" to begin answering domain queries.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {gameState === 'GAMEOVER' && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center p-6 rounded-lg"
              >
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase">DNS Offline</h2>
                <p className="text-red-300 mb-6 font-mono text-sm">Too many timeouts or incorrect resolutions.</p>
                <button 
                  onClick={startGame}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-8 rounded uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  Restart Service
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-emerald-500 rounded-lg p-6 shadow-[0_0_20px_rgba(16,185,129,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Globe className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">INTERNET SAVED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Outstanding! You successfully managed all DNS queries under heavy load. You accurately matched valid domains to their IP addresses and blocked the malicious fake domains with NXDOMAIN.
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase cursor-pointer"
              >
                RETURN TO MENU
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
