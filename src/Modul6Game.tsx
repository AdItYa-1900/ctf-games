import { useState, useEffect } from 'react';
import './index6game.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Globe, Monitor, Server, FileCode2, Image as ImageIcon, FileJson, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Client {
  id: number;
  requestTarget: string | null;
  timeRemaining: number; // 0 to 100
  status: 'IDLE' | 'WAITING' | 'SUCCESS' | 'ERROR';
}

const FILES = [
  { name: 'index.html', icon: FileCode2, color: 'text-orange-400' },
  { name: 'style.css', icon: FileCode2, color: 'text-blue-400' },
  { name: 'logo.png', icon: ImageIcon, color: 'text-emerald-400' },
  { name: 'data.json', icon: FileJson, color: 'text-yellow-400' }
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
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
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

export default function Modul6Game() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WON' | 'GAMEOVER'>('START');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  const [clients, setClients] = useState<Client[]>([
    { id: 1, requestTarget: null, timeRemaining: 100, status: 'IDLE' },
    { id: 2, requestTarget: null, timeRemaining: 100, status: 'IDLE' },
    { id: 3, requestTarget: null, timeRemaining: 100, status: 'IDLE' }
  ]);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);

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
    setClients([
      { id: 1, requestTarget: null, timeRemaining: 100, status: 'IDLE' },
      { id: 2, requestTarget: null, timeRemaining: 100, status: 'IDLE' },
      { id: 3, requestTarget: null, timeRemaining: 100, status: 'IDLE' }
    ]);
    setSelectedFile(null);
    setGameState('PLAYING');
  };

  const triggerClientSuccess = (clientId: number) => {
    sound.playSuccess();
    setScore(s => s + 1);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'SUCCESS' } : c));
    
    setTimeout(() => {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'IDLE', requestTarget: null, timeRemaining: 100 } : c));
    }, 1000);
  };

  const triggerClientError = (clientId: number) => {
    sound.playError();
    setLives(l => l - 1);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'ERROR' } : c));
    
    setTimeout(() => {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'IDLE', requestTarget: null, timeRemaining: 100 } : c));
    }, 1000);
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const intervalId = setInterval(() => {
      setClients(prevClients => {
        let updated = [...prevClients];

        // 1. Spawning new requests
        const idleClients = updated.filter(c => c.status === 'IDLE');
        if (idleClients.length > 0) {
          // Spawn chance increases with score (reduced by 50% for easier difficulty)
          const spawnChance = 0.01 + (score * 0.0025);
          if (Math.random() < spawnChance) {
            const randomClient = idleClients[Math.floor(Math.random() * idleClients.length)];
            const randomFile = FILES[Math.floor(Math.random() * FILES.length)].name;
            
            updated = updated.map(c => c.id === randomClient.id ? { 
              ...c, 
              status: 'WAITING', 
              requestTarget: randomFile, 
              timeRemaining: 100 
            } : c);
            sound.playClick();
          }
        }

        // 2. Ticking timers for waiting clients
        let lostLife = false;
        updated = updated.map(c => {
          if (c.status === 'WAITING') {
            // Speed increases with score (reduced by 50% for easier difficulty)
            const decay = 0.25 + (score * 0.025);
            const newTime = c.timeRemaining - decay;
            
            if (newTime <= 0) {
              lostLife = true;
              return { ...c, status: 'ERROR', timeRemaining: 0 }; // Timeout
            }
            return { ...c, timeRemaining: newTime };
          }
          return c;
        });

        if (lostLife) {
          sound.playError();
          setLives(l => l - 1);
          // Auto-reset timed out clients after 1s
          setTimeout(() => {
            setClients(curr => curr.map(c => c.status === 'ERROR' && c.timeRemaining <= 0 ? { ...c, status: 'IDLE', requestTarget: null, timeRemaining: 100 } : c));
          }, 1000);
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [gameState, score]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      if (score >= WIN_SCORE) {
        sound.playWin();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#f97316', '#fdba74'] });
        setGameState('WON');
      } else if (lives <= 0) {
        setGameState('GAMEOVER');
      }
    }
  }, [score, lives, gameState]);

  const handleClientClick = (client: Client) => {
    if (client.status !== 'WAITING') return;

    if (!selectedFile) {
      // Trying to send empty response
      return;
    }

    if (selectedFile === client.requestTarget) {
      triggerClientSuccess(client.id);
    } else {
      triggerClientError(client.id);
    }
    
    // Consume the selected file
    setSelectedFile(null);
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-orange-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(249,115,22,0.25)] select-none transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 06 // Client-Server Architecture
        </span>
        <div className="flex items-center gap-3">
          <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-orange-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
          </button>
        </div>
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
                  
                  <h2 className="text-orange-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5" /> Web Traffic Controller
                  </h2>
                  <p>
                    The <strong>Client-Server Model</strong> is the foundation of the internet.
                  </p>
                  
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-900/40 text-orange-400 font-bold px-2 py-1 rounded text-xs mt-1 w-16 text-center">Client</div>
                      <div className="text-xs text-slate-400">Devices (like web browsers) that send a <strong>Request</strong> asking for information.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-900/40 text-orange-400 font-bold px-2 py-1 rounded text-xs mt-1 w-16 text-center">Server</div>
                      <div className="text-xs text-slate-400">Computers that receive requests, find the data, and send it back as a <strong>Response</strong>.</div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 border border-orange-500/30 bg-orange-950/20 rounded-lg">
                    <span className="text-orange-400 font-bold block mb-1 text-xs uppercase tracking-wider">Your Mission</span>
                    You are the Web Server. Clients (Browsers) will request specific files. Click the requested file in your Server Storage, then click the waiting Client to send the Response!
                    <br/><br/>
                    Serve {WIN_SCORE} requests before you lose your 3 lives to timeouts or errors.
                  </div>

                  {gameState === 'START' && (
                    <div className="mt-auto">
                      <button 
                        onClick={startGame}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      >
                        Start Server
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
                    
                    {/* Clients Side */}
                    <div className="flex flex-col justify-around relative z-10 py-4">
                      <div className="absolute inset-y-0 right-0 w-px bg-slate-800 border-r border-dashed border-slate-700"></div>
                      
                      {clients.map(client => (
                        <div key={client.id} className="relative w-full pr-8">
                          
                          {/* Speech Bubble for Request */}
                          <AnimatePresence>
                            {client.status === 'WAITING' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute -top-12 left-4 bg-orange-900/90 border border-orange-500 text-white text-xs p-2 rounded shadow-lg z-20 font-mono whitespace-nowrap"
                              >
                                GET {client.requestTarget}
                                <div className="absolute -bottom-2 left-6 w-3 h-3 bg-orange-900 border-b border-r border-orange-500 transform rotate-45"></div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <button 
                            onClick={() => handleClientClick(client)}
                            disabled={gameState !== 'PLAYING'}
                            className={`w-full flex items-center gap-4 bg-slate-900 border-2 p-3 rounded-lg transition-all group cursor-pointer
                              ${client.status === 'WAITING' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:bg-orange-950/30' : ''}
                              ${client.status === 'SUCCESS' ? 'border-emerald-500 bg-emerald-950/50' : ''}
                              ${client.status === 'ERROR' ? 'border-red-500 bg-red-950/50' : ''}
                              ${client.status === 'IDLE' ? 'border-slate-700 opacity-50' : ''}
                            `}
                          >
                            <Monitor className={`w-8 h-8 
                              ${client.status === 'WAITING' ? 'text-orange-400' : ''}
                              ${client.status === 'SUCCESS' ? 'text-emerald-400' : ''}
                              ${client.status === 'ERROR' ? 'text-red-400' : ''}
                              ${client.status === 'IDLE' ? 'text-slate-500' : ''}
                            `} />
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Browser</span>
                                {client.status === 'WAITING' && (
                                  <span className="text-[10px] font-mono text-orange-400">{Math.ceil(client.timeRemaining)}%</span>
                                )}
                              </div>
                              
                              {/* Timer Bar */}
                              {client.status === 'WAITING' && (
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-75 ${client.timeRemaining > 30 ? 'bg-orange-500' : 'bg-red-500'}`} 
                                    style={{ width: `${client.timeRemaining}%` }}
                                  ></div>
                                </div>
                              )}
                              {client.status === 'SUCCESS' && <span className="text-xs text-emerald-400 font-mono font-bold">200 OK</span>}
                              {client.status === 'ERROR' && <span className="text-xs text-red-400 font-mono font-bold">{client.timeRemaining <= 0 ? 'TIMEOUT' : '404 NOT FOUND'}</span>}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Server Side */}
                    <div className="flex flex-col relative z-10 pl-4 py-4">
                      
                      {/* Active Response Box */}
                      <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 mb-6 flex flex-col items-center justify-center min-h-[100px]">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Active Response Payload</span>
                        {selectedFile ? (
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="bg-blue-900/50 border border-blue-500 text-blue-300 px-4 py-2 rounded flex items-center gap-2 font-mono text-sm"
                          >
                            {FILES.find(f => f.name === selectedFile)?.name}
                            <button onClick={() => setSelectedFile(null)} className="ml-2 text-slate-400 hover:text-white"><AlertCircle className="w-4 h-4"/></button>
                          </motion.div>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono text-center">Click a file below to prepare response</span>
                        )}
                      </div>

                      {/* File System */}
                      <div className="bg-[#0a0514] border border-slate-800 rounded-lg p-4 flex-1 shadow-inner">
                        <div className="flex items-center gap-2 text-slate-400 mb-4 border-b border-slate-800 pb-2">
                          <Server className="w-5 h-5 text-slate-500" />
                          <span className="text-xs font-bold uppercase tracking-widest">Server Storage</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {FILES.map(file => {
                            const Icon = file.icon;
                            return (
                              <button
                                key={file.name}
                                disabled={gameState !== 'PLAYING'}
                                onClick={() => {
                                  sound.playClick();
                                  setSelectedFile(file.name);
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded border transition-all cursor-pointer outline-none
                                  ${selectedFile === file.name ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-600'}
                                `}
                              >
                                <Icon className={`w-8 h-8 mb-2 ${file.color} ${selectedFile === file.name ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] text-slate-300 font-mono">{file.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Overlays */}
                  {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center">
                      <div className="bg-orange-900/20 border border-orange-500 p-4 rounded text-orange-400 font-mono text-center max-w-xs">
                        Click "Start Server" to begin processing client requests.
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
                <h2 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase">Server Crashed</h2>
                <p className="text-red-300 mb-6 font-mono text-sm">Too many timeouts or bad responses.</p>
                <button 
                  onClick={startGame}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-8 rounded uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  Reboot Server
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-orange-500 rounded-lg p-6 shadow-[0_0_20px_rgba(249,115,22,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Globe className="w-12 h-12 text-orange-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">TRAFFIC CONTROLLED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Outstanding! You successfully managed all client requests and delivered the correct responses. You now understand the fast-paced reality of the Client-Server model!
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold uppercase cursor-pointer"
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
