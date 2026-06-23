import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, CheckCircle2, Terminal as TerminalIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FileNode {
  name: string;
  type: 'dir' | 'file';
  content?: string;
  children?: Record<string, FileNode>;
}

const FILE_SYSTEM: Record<string, FileNode> = {
  '/': {
    name: '/',
    type: 'dir',
    children: {
      'home': {
        name: 'home',
        type: 'dir',
        children: {
          'user': {
            name: 'user',
            type: 'dir',
            children: {
              'readme.txt': { name: 'readme.txt', type: 'file', content: 'Welcome to the system. The secret is in /var/log/secret.txt' }
            }
          }
        }
      },
      'var': {
        name: 'var',
        type: 'dir',
        children: {
          'log': {
            name: 'log',
            type: 'dir',
            children: {
              'system.log': { name: 'system.log', type: 'file', content: 'System booted successfully at 04:00.' },
              'secret.txt': { name: 'secret.txt', type: 'file', content: 'FLAG{FILE_SYSTEM_MASTER}' }
            }
          }
        }
      },
      'etc': {
        name: 'etc',
        type: 'dir',
        children: {
          'passwd': { name: 'passwd', type: 'file', content: 'root:x:0:0:root:/root:/bin/bash' }
        }
      }
    }
  }
};

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

  public playKeypress() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
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

export default function Modul3Game() {
  const [gameState, setGameState] = useState<'PLAYING' | 'WON'>('PLAYING');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  
  const [currentPath, setCurrentPath] = useState<string[]>(['home', 'user']);
  const [terminalHistory, setTerminalHistory] = useState<{ command: string, output: string[] }[]>([{
    command: '', output: ['Welcome to Sentinel OS.', 'Type "ls" to list files, "cd <dir>" to change directory, "cat <file>" to read a file.', 'Find and read the secret flag located in /var/log/secret.txt.']
  }]);
  const [inputValue, setInputValue] = useState('');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const getNodeByPath = (pathArray: string[]): FileNode | null => {
    let current: FileNode = FILE_SYSTEM['/'];
    for (const p of pathArray) {
      if (current.children && current.children[p]) {
        current = current.children[p];
      } else {
        return null;
      }
    }
    return current;
  };

  const getAbsolutePath = (target: string): string[] | null => {
    if (target === '/') return [];
    if (target.startsWith('/')) {
      const parts = target.split('/').filter(p => p !== '');
      return getNodeByPath(parts) ? parts : null;
    }
    if (target === '..') {
      if (currentPath.length === 0) return [];
      return currentPath.slice(0, -1);
    }
    if (target === '.') return currentPath;
    
    const newPath = [...currentPath, ...target.split('/').filter(p => p !== '')];
    return getNodeByPath(newPath) ? newPath : null;
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const cmdLine = inputValue.trim();
    setInputValue('');
    sound.playKeypress();

    const parts = cmdLine.split(' ');
    const cmd = parts[0];
    const arg = parts[1] || '';

    let output: string[] = [];
    const promptPath = '/' + currentPath.join('/');

    if (cmd === 'ls') {
      const targetPath = arg ? getAbsolutePath(arg) : currentPath;
      if (!targetPath) {
        output = [`ls: cannot access '${arg}': No such file or directory`];
      } else {
        const node = getNodeByPath(targetPath);
        if (node && node.type === 'dir' && node.children) {
          output = [Object.keys(node.children).join('  ')];
        } else if (node && node.type === 'file') {
          output = [node.name];
        }
      }
    } else if (cmd === 'cd') {
      if (!arg) {
        setCurrentPath(['home', 'user']);
      } else {
        const targetPath = getAbsolutePath(arg);
        if (!targetPath) {
          output = [`cd: ${arg}: No such file or directory`];
        } else {
          const node = getNodeByPath(targetPath);
          if (node && node.type === 'dir') {
            setCurrentPath(targetPath);
          } else {
            output = [`cd: ${arg}: Not a directory`];
          }
        }
      }
    } else if (cmd === 'cat') {
      if (!arg) {
        output = ['cat: missing operand'];
      } else {
        const targetPath = getAbsolutePath(arg);
        if (!targetPath) {
          output = [`cat: ${arg}: No such file or directory`];
        } else {
          const node = getNodeByPath(targetPath);
          if (node && node.type === 'file') {
            output = [node.content || ''];
            if (node.content?.includes('FLAG{')) {
              setTimeout(() => {
                sound.playSuccess();
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 }, colors: ['#eab308', '#f59e0b'] });
                setGameState('WON');
              }, 500);
            }
          } else {
            output = [`cat: ${arg}: Is a directory`];
          }
        }
      }
    } else if (cmd === 'clear') {
      setTerminalHistory([]);
      return;
    } else {
      output = [`${cmd}: command not found`];
    }

    setTerminalHistory(prev => [...prev, { command: `user@sentinel:${promptPath}$ ${cmdLine}`, output }]);
  };

  const renderTree = (node: FileNode, pathSoFar: string[] = []) => {
    const isCurrent = currentPath.join('/') === pathSoFar.join('/');
    
    return (
      <div key={node.name} className="ml-4 font-mono text-sm">
        <div className={`flex items-center gap-2 py-0.5 ${isCurrent && node.type === 'dir' ? 'text-yellow-400 font-bold bg-yellow-950/30 px-1 rounded' : 'text-slate-400'}`}>
          <span>{node.type === 'dir' ? (isCurrent ? '📂' : '📁') : '📄'}</span>
          <span>{node.name}</span>
        </div>
        {node.children && (
          <div className="border-l border-slate-800 ml-2">
            {Object.values(node.children).map(child => renderTree(child, [...pathSoFar, child.name]))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-[580px] w-full max-w-5xl bg-cyber-bg border-2 border-yellow-500 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(234,179,8,0.25)] select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border pb-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept Lab 03 // File System Navigation
        </span>
        <button onClick={handleToggleMute} className="p-1 rounded text-slate-400 hover:text-yellow-400 cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-yellow-400" />}
        </button>
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
                  <h2 className="text-yellow-400 font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TerminalIcon className="w-5 h-5" />
                    The Terminal
                  </h2>
                  <p>
                    Servers do not have mice or windows. We move around using text commands.
                    Think of the file system like a tree of folders, starting at the very top folder called <code className="bg-slate-900 text-yellow-300 px-1 rounded">/</code>.
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="font-mono font-bold text-yellow-400 mb-1">ls</div>
                      <div className="text-xs text-slate-400">Shows all files and folders in your current location.</div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="font-mono font-bold text-yellow-400 mb-1">cd [folder]</div>
                      <div className="text-xs text-slate-400">Moves you inside a folder. To go back out, type <code className="text-yellow-300">cd ..</code></div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="font-mono font-bold text-yellow-400 mb-1">cat [file]</div>
                      <div className="text-xs text-slate-400">Reads a file and prints its text on the screen.</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 border border-yellow-500/30 bg-yellow-950/20 rounded-lg">
                    <span className="text-yellow-400 font-bold block mb-1 text-xs uppercase tracking-wider">Your Mission</span>
                    Navigate to <code className="text-white">/var/log</code> and read the <code className="text-white">secret.txt</code> file using the terminal on the right.
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Lab */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                {/* Visual File Tree */}
                <div className="bg-[#05010e] border border-cyber-border p-4 rounded-lg h-48 overflow-y-auto scrollbar-thin">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Live File System Map</span>
                  {renderTree(FILE_SYSTEM['/'])}
                </div>

                {/* Terminal Simulator */}
                <div className="bg-black border border-cyber-border rounded-lg flex-1 flex flex-col font-mono text-sm overflow-hidden relative shadow-inner h-64">
                  <div className="bg-slate-900 border-b border-slate-800 px-3 py-1 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-slate-500 text-xs ml-2">user@sentinel:~</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 scrollbar-thin text-slate-300" onClick={() => document.getElementById('cmdInput')?.focus()}>
                    {terminalHistory.map((entry, idx) => (
                      <div key={idx} className="mb-2">
                        {entry.command && <div className="text-yellow-400">{entry.command}</div>}
                        {entry.output.map((line, i) => (
                          <div key={i} className="whitespace-pre-wrap">{line}</div>
                        ))}
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                    
                    <form onSubmit={handleCommand} className="flex items-center text-yellow-400 mt-1">
                      <span className="mr-2 shrink-0">user@sentinel:/{currentPath.join('/')}$</span>
                      <input 
                        id="cmdInput"
                        type="text" 
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value);
                          sound.playKeypress();
                        }}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        className="bg-transparent outline-none border-none flex-1 text-slate-300 caret-yellow-400 w-full"
                      />
                    </form>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {gameState === 'WON' && (
            <motion.div 
              key="won" 
              className="w-full max-w-md mx-auto bg-[#0d061a] border-2 border-yellow-500 rounded-lg p-6 shadow-[0_0_20px_rgba(234,179,8,0.35)] text-center space-y-5 mt-20" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CheckCircle2 className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">FUNDAMENTALS MASTERED</h2>
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                Excellent! You've successfully navigated the file system tree and interacted with files purely through the terminal.
              </p>
              <button
                onClick={() => {
                  sound.playKeypress();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold uppercase cursor-pointer"
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
