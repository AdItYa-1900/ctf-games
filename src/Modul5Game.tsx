import { useState, useEffect } from 'react';
import './index5game.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, CheckCircle2, Shield, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FileGoal {
  name: string;
  targetNum: string; // e.g. "600"
  targetStr: string; // e.g. "rw-------"
  description: string;
}

const FILES: FileGoal[] = [
  { name: 'private_key.pem', targetNum: '600', targetStr: 'rw-------', description: 'A highly sensitive private key. Only the Owner should be able to Read and Write. No one else should have any access.' },
  { name: 'public_script.sh', targetNum: '755', targetStr: 'rwxr-xr-x', description: 'A script everyone needs to run. The Owner gets full access (Read, Write, Execute). Group and Others get Read and Execute only.' }
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

  public playToggle() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  public playLock() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      [349.23, 440.00, 523.25].forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      });
    } catch {}
  }
}

const sound = new SoundManager();

export default function Modul5Game() {
  const [gameState, setGameState] = useState<'PLAYING' | 'WON'>('PLAYING');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const activeFile = FILES[currentFileIdx];

  const [perms, setPerms] = useState({
    ownerR: false, ownerW: false, ownerX: false,
    groupR: false, groupW: false, groupX: false,
    otherR: false, otherW: false, otherX: false,
  });

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const getPermString = () => {
    let str = '';
    str += perms.ownerR ? 'r' : '-';
    str += perms.ownerW ? 'w' : '-';
    str += perms.ownerX ? 'x' : '-';
    str += perms.groupR ? 'r' : '-';
    str += perms.groupW ? 'w' : '-';
    str += perms.groupX ? 'x' : '-';
    str += perms.otherR ? 'r' : '-';
    str += perms.otherW ? 'w' : '-';
    str += perms.otherX ? 'x' : '-';
    return str;
  };

  const getPermNumber = () => {
    const calc = (r: boolean, w: boolean, x: boolean) => (r ? 4 : 0) + (w ? 2 : 0) + (x ? 1 : 0);
    const owner = calc(perms.ownerR, perms.ownerW, perms.ownerX);
    const group = calc(perms.groupR, perms.groupW, perms.groupX);
    const other = calc(perms.otherR, perms.otherW, perms.otherX);
    return `${owner}${group}${other}`;
  };

  const togglePerm = (key: keyof typeof perms) => {
    sound.playToggle();
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (getPermNumber() === activeFile.targetNum) {
      sound.playLock();
      
      if (currentFileIdx < FILES.length - 1) {
        setTimeout(() => {
          setCurrentFileIdx(prev => prev + 1);
          setPerms({
            ownerR: false, ownerW: false, ownerX: false,
            groupR: false, groupW: false, groupX: false,
            otherR: false, otherW: false, otherX: false,
          });
        }, 1500);
      } else {
        setTimeout(() => {
          sound.playSuccess();
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#ef4444', '#f87171'] });
          setGameState('WON');
        }, 1000);
      }
    }
  }, [perms, activeFile, currentFileIdx, gameState]);

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-red-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(239,68,68,0.25)] select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 05 // File Permissions
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-red-400 bg-red-950/30 px-2.5 py-1 rounded border border-red-500/20 font-bold uppercase tracking-wider">
            File {currentFileIdx + 1} of {FILES.length}
          </span>
          <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-red-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-600" /> : <Volume2 className="w-4 h-4 text-red-400" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {gameState === 'PLAYING' && (
            <motion.div 
              key="playing" 
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left Panel: Education */}
              <div className="lg:col-span-4 space-y-4 text-sm font-sans flex flex-col">
                <div className="bg-[#0d061a] border border-cyber-border p-5 rounded-lg text-slate-300 flex-1 space-y-4">
                  <h2 className="text-red-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    File Permissions
                  </h2>
                  <p>
                    Every file on a computer has 3 types of users: <strong>Owner</strong> (the person who made it), <strong>Group</strong> (a team of people), and <strong>Others</strong> (everyone else in the world).
                  </p>
                  <p>
                    You can give each type of user 3 powers:
                  </p>
                  
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="font-mono text-red-400 font-bold">r = Read</span>
                      <span className="font-mono text-slate-400">Value: 4</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="font-mono text-orange-400 font-bold">w = Write</span>
                      <span className="font-mono text-slate-400">Value: 2</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-blue-400 font-bold">x = Execute</span>
                      <span className="font-mono text-slate-400">Value: 1</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    These powers are added together as numbers. So Read (4) + Write (2) = 6. <br/>
                    If a file's permission is 644, it means the Owner gets a 6, the Group gets a 4, and Others get a 4.
                  </p>

                  <div className="mt-6 p-4 border border-red-500/30 bg-red-950/20 rounded-lg">
                    <span className="text-red-400 font-bold block mb-1 text-xs uppercase tracking-wider">Your Mission</span>
                    {activeFile.description}
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Sandbox */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                {/* Active File Target */}
                <div className="bg-[#05010e] border border-cyber-border p-5 rounded-lg flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <Lock className="w-8 h-8 text-slate-500" />
                    <div>
                      <div className="text-white font-mono font-bold text-lg">{activeFile.name}</div>
                      <div className="text-slate-400 text-xs uppercase tracking-widest">Goal: {activeFile.targetNum} ({activeFile.targetStr})</div>
                    </div>
                  </div>
                  
                  {/* Live Feedback Display */}
                  <div className="bg-black border-2 border-slate-800 p-3 rounded-lg text-center flex gap-4 min-w-[150px]">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">String</div>
                      <div className="font-mono text-lg font-bold tracking-widest text-white">{getPermString()}</div>
                    </div>
                    <div className="border-l border-slate-800 pl-4">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Octal</div>
                      <div className="font-mono text-lg font-bold text-red-400">{getPermNumber()}</div>
                    </div>
                  </div>
                </div>

                {/* 3x3 Grid Matrix */}
                <div className="bg-[#0d061a] border border-cyber-border rounded-lg flex-1 p-6 flex flex-col justify-center">
                  
                  <div className="grid grid-cols-4 gap-4 text-center mb-4">
                    <div></div>
                    <div className="font-bold text-slate-300 uppercase tracking-widest text-sm">Owner</div>
                    <div className="font-bold text-slate-300 uppercase tracking-widest text-sm">Group</div>
                    <div className="font-bold text-slate-300 uppercase tracking-widest text-sm">Others</div>
                  </div>

                  {/* Read Row */}
                  <div className="grid grid-cols-4 gap-4 items-center mb-4">
                    <div className="text-right font-bold text-red-400 font-mono flex flex-col">
                      <span>READ (r)</span>
                      <span className="text-[10px] text-slate-500">+4</span>
                    </div>
                    {[
                      { key: 'ownerR', val: perms.ownerR },
                      { key: 'groupR', val: perms.groupR },
                      { key: 'otherR', val: perms.otherR }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-center">
                        <button
                          onClick={() => togglePerm(item.key as any)}
                          className={`w-16 h-16 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-mono text-2xl font-bold shadow-lg ${
                            item.val 
                              ? 'bg-red-900/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] scale-105' 
                              : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-red-900'
                          }`}
                        >
                          {item.val ? 'r' : '-'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Write Row */}
                  <div className="grid grid-cols-4 gap-4 items-center mb-4">
                    <div className="text-right font-bold text-orange-400 font-mono flex flex-col">
                      <span>WRITE (w)</span>
                      <span className="text-[10px] text-slate-500">+2</span>
                    </div>
                    {[
                      { key: 'ownerW', val: perms.ownerW },
                      { key: 'groupW', val: perms.groupW },
                      { key: 'otherW', val: perms.otherW }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-center">
                        <button
                          onClick={() => togglePerm(item.key as any)}
                          className={`w-16 h-16 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-mono text-2xl font-bold shadow-lg ${
                            item.val 
                              ? 'bg-orange-900/40 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] scale-105' 
                              : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-orange-900'
                          }`}
                        >
                          {item.val ? 'w' : '-'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Execute Row */}
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="text-right font-bold text-blue-400 font-mono flex flex-col">
                      <span>EXECUTE (x)</span>
                      <span className="text-[10px] text-slate-500">+1</span>
                    </div>
                    {[
                      { key: 'ownerX', val: perms.ownerX },
                      { key: 'groupX', val: perms.groupX },
                      { key: 'otherX', val: perms.otherX }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-center">
                        <button
                          onClick={() => togglePerm(item.key as any)}
                          className={`w-16 h-16 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-mono text-2xl font-bold shadow-lg ${
                            item.val 
                              ? 'bg-blue-900/40 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105' 
                              : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-blue-900'
                          }`}
                        >
                          {item.val ? 'x' : '-'}
                        </button>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-red-500 rounded-lg p-6 shadow-[0_0_20px_rgba(239,68,68,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CheckCircle2 className="w-12 h-12 text-red-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">PERMISSIONS SECURED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Outstanding! You correctly locked down the files using the right permissions.
              </p>
              <button
                onClick={() => {
                  sound.playToggle();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase cursor-pointer"
              >
                RETURN TO ACCESS PORTAL
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
