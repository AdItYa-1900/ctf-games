import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, RefreshCw, Terminal, ChevronRight,
  CheckCircle2, Folder, FolderOpen, FileText, Lightbulb, Target, CornerDownLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. SYNTHESIZED SOUND SYSTEM (Web Audio API)
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('sentinel_sound_muted');
    this.isMuted = savedMute === 'true';
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('sentinel_sound_muted', muted ? 'true' : 'false');
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {
      console.warn(e);
    }
  }

  public playKey() {
    this.tone('square', 420, 520, 0.03, 0.015);
  }

  public playClick() {
    this.tone('sine', 800, 1200, 0.05, 0.04);
  }

  public playRun() {
    this.tone('sine', 520, 660, 0.07, 0.04);
  }

  public playError() {
    this.tone('sawtooth', 160, 70, 0.2, 0.07);
  }

  public playObjectiveComplete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.05, i * 0.07));
  }

  public playVictory() {
    [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone('sine', f, f, 0.4, 0.05, i * 0.08),
    );
  }
}

const sound = new SoundManager();

// ==========================================
// 2. VIRTUAL FILE SYSTEM
// ==========================================
interface FileNode {
  type: 'file';
  content: string;
  hidden?: boolean;
}
interface DirNode {
  type: 'dir';
  hidden?: boolean;
  children: Record<string, FsNode>;
}
type FsNode = FileNode | DirNode;

const HOME = '/home/agent';

const buildInitialFs = (): DirNode => ({
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        agent: {
          type: 'dir',
          children: {
            'mission.txt': {
              type: 'file',
              content:
                'PROJECT SENTINEL // Terminal Awakening\nYour shell is live. Follow each objective to earn clearance.',
            },
            '.briefing': {
              type: 'file',
              hidden: true,
              content:
                'CLASSIFIED: Obsidian hides stolen data inside directories.\nMaster create, manage and remove operations to dismantle their stash.',
            },
          },
        },
      },
    },
  },
});

const clone = (fs: DirNode): DirNode => JSON.parse(JSON.stringify(fs)) as DirNode;

const splitPath = (p: string): string[] => p.split('/').filter(Boolean);

// Resolve a target (relative or absolute) against cwd into an absolute path.
const resolvePath = (cwd: string, target: string): string => {
  let base: string[];
  if (!target || target === '.') return cwd;
  if (target === '~' || target.startsWith('~/')) {
    base = splitPath(HOME);
    target = target.slice(1).replace(/^\//, '');
  } else if (target.startsWith('/')) {
    base = [];
  } else {
    base = splitPath(cwd);
  }
  for (const seg of splitPath(target)) {
    if (seg === '.') continue;
    if (seg === '..') base.pop();
    else base.push(seg);
  }
  return '/' + base.join('/');
};

const getNode = (fs: DirNode, absPath: string): FsNode | null => {
  let node: FsNode = fs;
  for (const seg of splitPath(absPath)) {
    if (node.type !== 'dir' || !node.children[seg]) return null;
    node = node.children[seg];
  }
  return node;
};

const getParentDir = (fs: DirNode, absPath: string): { dir: DirNode | null; name: string } => {
  const segs = splitPath(absPath);
  const name = segs.pop() ?? '';
  const parent = getNode(fs, '/' + segs.join('/'));
  return { dir: parent && parent.type === 'dir' ? parent : null, name };
};

interface ParsedCmd {
  cmd: string;
  flags: Set<string>; // single-letter flags, e.g. 'a', 'l', 'r'
  longFlags: Set<string>; // long flags, e.g. 'all', 'help'
  args: string[];
}

const parse = (raw: string): ParsedCmd => {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const cmd = parts[0] ?? '';
  const flags = new Set<string>();
  const longFlags = new Set<string>();
  const args: string[] = [];
  for (const p of parts.slice(1)) {
    if (p.startsWith('--')) longFlags.add(p.slice(2));
    else if (p.startsWith('-') && p.length > 1) for (const ch of p.slice(1)) flags.add(ch);
    else args.push(p);
  }
  return { cmd, flags, longFlags, args };
};

interface ExecResult {
  fs: DirNode;
  cwd: string;
  output: string[];
  clear?: boolean;
  isError: boolean;
}

const MANUALS: Record<string, string> = {
  ls: 'NAME\n  ls - list directory contents\n\nSYNOPSIS\n  ls [OPTION] [FILE]\n\nOPTIONS\n  -a, --all   do not ignore entries starting with .\n  -l          use a long listing format',
  cd: 'NAME\n  cd - change the working directory\n\nSYNOPSIS\n  cd [DIRECTORY]\n  cd ..   move to the parent directory\n  cd ~    move to your home directory',
  pwd: 'NAME\n  pwd - print name of current/working directory',
  mkdir: 'NAME\n  mkdir - make directories\n\nSYNOPSIS\n  mkdir DIRECTORY',
  touch: 'NAME\n  touch - create a file / change file timestamps\n\nSYNOPSIS\n  touch FILE',
  cat: 'NAME\n  cat - concatenate files and print on the standard output\n\nSYNOPSIS\n  cat FILE',
  cp: 'NAME\n  cp - copy files\n\nSYNOPSIS\n  cp SOURCE DEST',
  mv: 'NAME\n  mv - move (rename) files\n\nSYNOPSIS\n  mv SOURCE DEST',
  rm: 'NAME\n  rm - remove files or directories\n\nSYNOPSIS\n  rm FILE\n  rm -r DIRECTORY   remove a directory and its contents',
};

const ALL_COMMANDS = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'rm', 'echo', 'man', 'clear', 'help'];

// Execute a command against a copy of the filesystem and return the next state.
const execute = (raw: string, fsIn: DirNode, cwd: string): ExecResult => {
  const fs = clone(fsIn);
  const { cmd, flags, longFlags, args } = parse(raw);
  const out: string[] = [];
  const err = (m: string): ExecResult => ({ fs: fsIn, cwd, output: [m], isError: true });

  if (longFlags.has('help')) {
    out.push(`Usage: ${cmd} [OPTION]... [FILE]...`, MANUALS[cmd] ?? 'No quick help available for this command.');
    return { fs: fsIn, cwd, output: out, isError: false };
  }

  switch (cmd) {
    case '':
      return { fs: fsIn, cwd, output: [], isError: false };

    case 'help':
      return {
        fs: fsIn,
        cwd,
        output: ['Available commands:', '  ' + ALL_COMMANDS.join('  '), "Tip: try 'man <command>' or '<command> --help'."],
        isError: false,
      };

    case 'clear':
      return { fs: fsIn, cwd, output: [], clear: true, isError: false };

    case 'pwd':
      return { fs: fsIn, cwd, output: [cwd], isError: false };

    case 'echo':
      return { fs: fsIn, cwd, output: [args.join(' ')], isError: false };

    case 'man': {
      if (!args[0]) return err('What manual page do you want?');
      const man = MANUALS[args[0]];
      if (!man) return err(`No manual entry for ${args[0]}`);
      return { fs: fsIn, cwd, output: man.split('\n'), isError: false };
    }

    case 'ls': {
      const targetPath = resolvePath(cwd, args[0] ?? '.');
      const node = getNode(fs, targetPath);
      if (!node) return err(`ls: cannot access '${args[0]}': No such file or directory`);
      const showHidden = flags.has('a') || longFlags.has('all');
      const long = flags.has('l');
      if (node.type === 'file') return { fs: fsIn, cwd, output: [args[0] ?? ''], isError: false };
      let names = Object.keys(node.children).filter((n) => showHidden || !node.children[n].hidden);
      if (showHidden) names = ['.', '..', ...names];
      names.sort();
      if (long) {
        const lines = names.map((n) => {
          if (n === '.' || n === '..') return `drwxr-xr-x  agent  ${n}`;
          const child = node.children[n];
          const tag = child.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
          return `${tag}  agent  ${n}`;
        });
        return { fs: fsIn, cwd, output: lines.length ? lines : ['(empty)'], isError: false };
      }
      return { fs: fsIn, cwd, output: names.length ? [names.join('   ')] : ['(empty)'], isError: false };
    }

    case 'cd': {
      const targetPath = resolvePath(cwd, args[0] ?? HOME);
      const node = getNode(fs, targetPath);
      if (!node) return err(`cd: ${args[0]}: No such file or directory`);
      if (node.type !== 'dir') return err(`cd: ${args[0]}: Not a directory`);
      return { fs: fsIn, cwd: targetPath === '/' ? '/' : targetPath, output: [], isError: false };
    }

    case 'mkdir': {
      if (!args[0]) return err('mkdir: missing operand');
      const path = resolvePath(cwd, args[0]);
      const { dir, name } = getParentDir(fs, path);
      if (!dir) return err(`mkdir: cannot create directory '${args[0]}': No such file or directory`);
      if (dir.children[name]) return err(`mkdir: cannot create directory '${args[0]}': File exists`);
      dir.children[name] = { type: 'dir', children: {} };
      return { fs, cwd, output: [], isError: false };
    }

    case 'touch': {
      if (!args[0]) return err('touch: missing file operand');
      const path = resolvePath(cwd, args[0]);
      const { dir, name } = getParentDir(fs, path);
      if (!dir) return err(`touch: cannot touch '${args[0]}': No such file or directory`);
      if (!dir.children[name]) dir.children[name] = { type: 'file', content: '', hidden: name.startsWith('.') };
      return { fs, cwd, output: [], isError: false };
    }

    case 'cat': {
      if (!args[0]) return err('cat: missing file operand');
      const node = getNode(fs, resolvePath(cwd, args[0]));
      if (!node) return err(`cat: ${args[0]}: No such file or directory`);
      if (node.type === 'dir') return err(`cat: ${args[0]}: Is a directory`);
      return { fs: fsIn, cwd, output: node.content ? node.content.split('\n') : [''], isError: false };
    }

    case 'cp': {
      if (args.length < 2) return err('cp: missing destination file operand');
      const src = getNode(fs, resolvePath(cwd, args[0]));
      if (!src) return err(`cp: cannot stat '${args[0]}': No such file or directory`);
      if (src.type === 'dir') return err(`cp: -r not specified; omitting directory '${args[0]}'`);
      const { dir, name } = getParentDir(fs, resolvePath(cwd, args[1]));
      if (!dir) return err(`cp: cannot create regular file '${args[1]}': No such file or directory`);
      dir.children[name] = { type: 'file', content: src.content, hidden: name.startsWith('.') };
      return { fs, cwd, output: [], isError: false };
    }

    case 'mv': {
      if (args.length < 2) return err('mv: missing destination file operand');
      const srcPath = resolvePath(cwd, args[0]);
      const src = getNode(fs, srcPath);
      if (!src) return err(`mv: cannot stat '${args[0]}': No such file or directory`);
      const { dir: srcDir, name: srcName } = getParentDir(fs, srcPath);
      const { dir: dstDir, name: dstName } = getParentDir(fs, resolvePath(cwd, args[1]));
      if (!dstDir) return err(`mv: cannot move '${args[0]}': No such file or directory`);
      if (srcDir) delete srcDir.children[srcName];
      dstDir.children[dstName] = src;
      return { fs, cwd, output: [], isError: false };
    }

    case 'rm': {
      if (!args[0]) return err('rm: missing operand');
      const path = resolvePath(cwd, args[0]);
      const node = getNode(fs, path);
      if (!node) return err(`rm: cannot remove '${args[0]}': No such file or directory`);
      if (node.type === 'dir' && !flags.has('r'))
        return err(`rm: cannot remove '${args[0]}': Is a directory`);
      const { dir, name } = getParentDir(fs, path);
      if (dir) delete dir.children[name];
      return { fs, cwd, output: [], isError: false };
    }

    default:
      return err(`bash: ${cmd}: command not found`);
  }
};

// ==========================================
// 3. MISSIONS
// ==========================================
interface MissionCtx {
  parsed: ParsedCmd;
  raw: string;
  fs: DirNode;
  cwd: string;
}
interface Mission {
  id: number;
  tag: string;
  title: string;
  brief: string;
  hint: string;
  concept: string;
  check: (ctx: MissionCtx) => boolean;
}

const exists = (fs: DirNode, path: string) => getNode(fs, path) !== null;

const missions: Mission[] = [
  {
    id: 1,
    tag: 'ORIENT',
    title: 'Where am I?',
    brief: 'Every shell session starts inside a directory. Print your current location.',
    hint: 'pwd',
    concept: 'pwd = "print working directory". It tells you exactly where you are in the filesystem.',
    check: ({ parsed }) => parsed.cmd === 'pwd',
  },
  {
    id: 2,
    tag: 'SCAN',
    title: 'List the contents',
    brief: 'See what files and directories live here.',
    hint: 'ls',
    concept: 'ls lists the visible contents of a directory.',
    check: ({ parsed }) => parsed.cmd === 'ls',
  },
  {
    id: 3,
    tag: 'FLAGS',
    title: 'Reveal hidden files',
    brief: 'A hidden file (its name starts with a dot) is here. Use a flag to reveal it.',
    hint: 'ls -a',
    concept: 'Flags modify a command. ls shows visible files; ls -a (or ls --all) also shows hidden ones.',
    check: ({ parsed }) => parsed.cmd === 'ls' && (parsed.flags.has('a') || parsed.longFlags.has('all')),
  },
  {
    id: 4,
    tag: 'READ',
    title: 'Read the briefing',
    brief: 'Display the contents of the hidden file .briefing',
    hint: 'cat .briefing',
    concept: 'cat <file> prints a file to the screen. Structure: command + target.',
    check: ({ parsed }) => parsed.cmd === 'cat' && parsed.args.includes('.briefing'),
  },
  {
    id: 5,
    tag: 'CREATE',
    title: 'Make a directory',
    brief: 'Create a directory named evidence to store your findings.',
    hint: 'mkdir evidence',
    concept: 'mkdir = "make directory". It creates a new folder.',
    check: ({ fs }) => exists(fs, `${HOME}/evidence`),
  },
  {
    id: 6,
    tag: 'NAVIGATE',
    title: 'Enter the directory',
    brief: 'Move into the evidence directory.',
    hint: 'cd evidence',
    concept: 'cd = "change directory". Use it to move between folders.',
    check: ({ cwd }) => cwd === `${HOME}/evidence`,
  },
  {
    id: 7,
    tag: 'CREATE',
    title: 'Make a file',
    brief: 'Inside evidence, create an empty file named report.txt',
    hint: 'touch report.txt',
    concept: 'touch <file> creates a new empty file.',
    check: ({ fs }) => exists(fs, `${HOME}/evidence/report.txt`),
  },
  {
    id: 8,
    tag: 'MANAGE',
    title: 'Copy a file',
    brief: 'Make a duplicate of report.txt called backup.txt',
    hint: 'cp report.txt backup.txt',
    concept: 'cp <source> <destination> copies a file.',
    check: ({ fs }) => exists(fs, `${HOME}/evidence/backup.txt`) && exists(fs, `${HOME}/evidence/report.txt`),
  },
  {
    id: 9,
    tag: 'MANAGE',
    title: 'Rename a file',
    brief: 'Rename report.txt to findings.txt',
    hint: 'mv report.txt findings.txt',
    concept: 'mv <old> <new> moves or renames a file.',
    check: ({ fs }) => exists(fs, `${HOME}/evidence/findings.txt`) && !exists(fs, `${HOME}/evidence/report.txt`),
  },
  {
    id: 10,
    tag: 'MANAGE',
    title: 'Delete a file',
    brief: 'Remove the backup file backup.txt',
    hint: 'rm backup.txt',
    concept: 'rm <file> deletes a file permanently. There is no recycle bin.',
    check: ({ fs }) => !exists(fs, `${HOME}/evidence/backup.txt`) && exists(fs, `${HOME}/evidence`),
  },
  {
    id: 11,
    tag: 'NAVIGATE',
    title: 'Step back out',
    brief: 'Return to the parent directory (your home folder).',
    hint: 'cd ..',
    concept: 'cd .. moves up one level to the parent directory.',
    check: ({ cwd }) => cwd === HOME,
  },
  {
    id: 12,
    tag: 'DANGER',
    title: 'Purge the directory',
    brief: 'Delete the evidence directory and everything inside it.',
    hint: 'rm -r evidence',
    concept: 'rm -r removes a directory and all its contents. Powerful — always double-check first.',
    check: ({ fs }) => !exists(fs, `${HOME}/evidence`),
  },
  {
    id: 13,
    tag: 'HELP',
    title: 'Find answers',
    brief: 'The best operators know how to find help. Open the manual for the ls command.',
    hint: 'man ls',
    concept: 'man <command> opens the manual. <command> --help shows quick usage. You never have to memorise everything.',
    check: ({ parsed, raw }) =>
      (parsed.cmd === 'man' && parsed.args.includes('ls')) || raw.includes('--help'),
  },
];

const QUICK_COMMANDS = ['pwd', 'ls', 'ls -a', 'cd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'rm', 'rm -r', 'man'];

// ==========================================
// 4. BACKGROUND EFFECT
// ==========================================
const TelemetryOverlay: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg-green">
    <div className="absolute inset-0 cyber-grid-green opacity-40"></div>
    <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500/5 shadow-[0_0_6px_rgba(16,185,129,0.2)] animate-scanline"></div>
    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-emerald-500/20"></div>
    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-emerald-500/20"></div>
    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-emerald-500/20"></div>
    <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-emerald-500/20"></div>
  </div>
);

// ==========================================
// 5. INTRO SCREEN
// ==========================================
interface IntroScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, isMuted, onToggleMute }) => (
  <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-emerald-500 rounded-lg p-6 shadow-[0_0_20px_rgba(16,185,129,0.35)] text-center relative overflow-hidden backdrop-blur-md">
    <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-mono tracking-widest font-bold">
        <Terminal className="w-4 h-4" />
        PROJECT SENTINEL
      </div>
      <button
        onClick={onToggleMute}
        className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-emerald-400 cursor-pointer"
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
      </button>
    </div>

    <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">
      FIELD ASSESSMENT 02
    </h1>
    <h2 className="font-mono text-emerald-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">
      Mission: Terminal Awakening
    </h2>

    <div className="mt-6 space-y-5">
      <div className="bg-slate-950/60 border border-cyber-border/40 rounded p-5 text-left space-y-4 max-h-[360px] overflow-y-auto pr-1">
        <p className="text-slate-300 font-sans text-sm leading-relaxed">
          A blinking cursor is direct access to the operating system. In this assessment you operate a
          <span className="text-emerald-400 font-mono"> live Linux shell</span>. Type real commands and watch the
          filesystem change in real time.
        </p>

        <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
          <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">HOW IT WORKS</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[13px] font-sans">
            <li>Each objective asks you to perform one task.</li>
            <li>Type a command and press <span className="text-emerald-400 font-mono">Enter</span> to run it.</li>
            <li>The <span className="text-emerald-400 font-mono">FILESYSTEM</span> panel shows the effect instantly.</li>
            <li>Stuck? Reveal a hint or explore freely — wrong commands never cost you anything.</li>
          </ul>
        </div>

        <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
          <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">YOU WILL LEARN</p>
          <p className="text-slate-400 text-[13px] font-sans">
            Command structure, flags, creating &amp; managing files and directories, and how to find help.
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          sound.playRun();
          onStart();
        }}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-emerald-500 shadow-md cursor-pointer transition-all uppercase"
      >
        ENTER THE TERMINAL
      </button>
    </div>
  </div>
);

// ==========================================
// 6. FILESYSTEM TREE PANEL
// ==========================================
const FsTree: React.FC<{ node: DirNode; name: string; path: string; cwd: string; depth: number }> = ({
  node,
  name,
  path,
  cwd,
  depth,
}) => {
  const isCwd = path === cwd;
  const childNames = Object.keys(node.children).sort();
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 rounded px-1 ${
          isCwd ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isCwd ? <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
        <span className={`truncate ${node.hidden ? 'italic opacity-70' : ''}`}>{name}</span>
        {isCwd && <span className="text-[8px] text-emerald-500 font-bold ml-auto pr-1">YOU ARE HERE</span>}
      </div>
      {childNames.map((cn) => {
        const child = node.children[cn];
        if (child.type === 'dir') {
          return <FsTree key={cn} node={child} name={cn} path={`${path}/${cn}`} cwd={cwd} depth={depth + 1} />;
        }
        return (
          <div
            key={cn}
            className={`flex items-center gap-1.5 py-0.5 ${child.hidden ? 'text-slate-600 italic' : 'text-slate-500'}`}
            style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{cn}</span>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// 7. GAME SCREEN (TERMINAL SANDBOX)
// ==========================================
interface TermLine {
  id: string;
  kind: 'cmd' | 'out' | 'err' | 'sys';
  text: string;
}

interface GameScreenProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onFinished: (score: number) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ isMuted, onToggleMute, onFinished }) => {
  const [fs, setFs] = useState<DirNode>(() => buildInitialFs());
  const [cwd, setCwd] = useState<string>(HOME);
  const [missionIndex, setMissionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TermLine[]>([
    { id: 'w1', kind: 'sys', text: "Sentinel secure shell v2.0 — type 'help' for commands." },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const mission = missions[missionIndex];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const prompt = (path: string) => `agent@sentinel:${path.replace(HOME, '~')}$`;

  const pushLines = (entries: Omit<TermLine, 'id'>[]) =>
    setLines((prev) => [...prev, ...entries.map((e) => ({ ...e, id: `l${lineId.current++}` }))]);

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    pushLines([{ kind: 'cmd', text: `${prompt(cwd)} ${trimmed}` }]);
    if (!trimmed) return;

    const result = execute(trimmed, fs, cwd);

    if (result.clear) {
      setLines([]);
      return;
    }

    if (result.output.length) {
      pushLines(result.output.map((t) => ({ kind: result.isError ? 'err' : 'out', text: t }) as Omit<TermLine, 'id'>));
    }

    setFs(result.fs);
    setCwd(result.cwd);

    if (result.isError) {
      sound.playError();
    } else {
      sound.playRun();
    }

    const ctx: MissionCtx = { parsed: parse(trimmed), raw: trimmed, fs: result.fs, cwd: result.cwd };
    if (!result.isError && mission.check(ctx)) {
      const newScore = score + 100;
      setScore(newScore);
      setShowHint(false);
      setJustCompleted(true);
      sound.playObjectiveComplete();
      pushLines([{ kind: 'sys', text: `>> OBJECTIVE CLEARED: ${mission.title}  (+100)` }]);

      window.setTimeout(() => {
        setJustCompleted(false);
        if (missionIndex >= missions.length - 1) {
          onFinished(newScore);
        } else {
          setMissionIndex((i) => i + 1);
        }
      }, 900);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input;
    setInput('');
    runCommand(value);
  };

  const progress = Math.round((missionIndex / missions.length) * 100);

  return (
    <div className="relative w-full max-w-5xl bg-cyber-card/95 border border-cyber-border rounded-lg p-3 sm:p-4 shadow-2xl backdrop-blur-md">
      {/* HUD */}
      <div className="w-full bg-cyber-card/90 border border-cyber-border rounded-lg p-3 flex justify-between items-center font-mono text-xs shadow-md select-none mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CLEARANCE</span>
          <span className="text-emerald-400 font-bold text-sm text-glow-green">{score} PTS</span>
        </div>
        <div className="flex flex-col items-center flex-1 px-4 max-w-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            OBJECTIVE {missionIndex + 1} / {missions.length}
          </span>
          <div className="w-full bg-slate-950 border border-cyber-border rounded h-1.5 mt-1 overflow-hidden">
            <div className="h-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <button onClick={onToggleMute} className="p-1.5 rounded text-slate-400 hover:text-emerald-400 cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Objective banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mission.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-3 rounded-md border p-3 ${
            justCompleted ? 'border-emerald-500 bg-emerald-950/40' : 'border-emerald-500/40 bg-slate-950/60'
          }`}
        >
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-500 border border-emerald-500/40 rounded px-1.5 py-0.5">
                  {mission.tag}
                </span>
                <span className="text-slate-100 font-bold text-sm font-sans">{mission.title}</span>
              </div>
              <p className="text-slate-300 text-[13px] font-sans mt-1 leading-relaxed">{mission.brief}</p>
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className="bg-slate-950 border border-emerald-500/30 rounded px-3 py-2 text-xs space-y-1">
                      <p className="text-slate-400 font-sans">{mission.concept}</p>
                      <p className="font-mono text-emerald-400">
                        Try: <span className="font-bold">{mission.hint}</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                setShowHint((s) => !s);
              }}
              className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-300 border border-amber-400/40 rounded px-2 py-1 hover:bg-amber-400/10 cursor-pointer shrink-0"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {showHint ? 'Hide' : 'Hint'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Terminal + Filesystem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Terminal */}
        <div className="lg:col-span-2 flex flex-col bg-slate-950 border border-cyber-border/60 rounded-md overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-cyber-border/50 bg-cyber-card/60">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></span>
            <span className="ml-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">agent@sentinel — secure shell</span>
          </div>
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[300px] sm:h-[340px] overflow-y-auto px-3 py-2 font-mono text-[12px] sm:text-[13px] leading-relaxed cursor-text"
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className={`whitespace-pre-wrap break-words ${
                  l.kind === 'cmd'
                    ? 'text-slate-200'
                    : l.kind === 'err'
                      ? 'text-red-400'
                      : l.kind === 'sys'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                }`}
              >
                {l.text}
              </div>
            ))}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <span className="text-emerald-400 shrink-0">{prompt(cwd)}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  sound.playKey();
                }}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent outline-none text-emerald-200 caret-emerald-400"
              />
            </form>
          </div>
          {/* Quick command chips */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-cyber-border/50 bg-cyber-card/40">
            {QUICK_COMMANDS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  sound.playClick();
                  setInput((prev) => (prev ? `${prev} ${c}` : `${c} `));
                  inputRef.current?.focus();
                }}
                className="text-[10px] font-mono text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 hover:bg-emerald-500/10 cursor-pointer"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Filesystem panel */}
        <div className="bg-slate-950 border border-cyber-border/60 rounded-md overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-cyber-border/50 bg-cyber-card/60 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Filesystem</span>
            <span className="text-[9px] font-mono text-slate-500 truncate max-w-[60%]">{cwd.replace(HOME, '~')}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 font-mono text-[11px]">
            <FsTree node={fs} name="/" path="" cwd={cwd} depth={0} />
          </div>
        </div>
      </div>

      <div className="mt-2 text-center font-mono text-[10px] text-slate-500 flex items-center justify-center gap-1.5 select-none">
        <CornerDownLeft className="w-3 h-3" /> Press Enter to run a command
      </div>
    </div>
  );
};

// ==========================================
// 8. END SCREEN
// ==========================================
interface EndScreenProps {
  score: number;
  onRestart: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ score, onRestart }) => {
  useEffect(() => {
    sound.playVictory();
    confetti({ particleCount: 130, spread: 75, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#a258ff'] });
  }, []);

  return (
    <div className="w-full max-w-md bg-cyber-card/95 border border-cyber-border rounded-lg p-6 shadow-2xl space-y-6 backdrop-blur-md relative select-none">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

      <div className="text-center border-b border-cyber-border/40 pb-3">
        <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ASSESSMENT COMPLETE</span>
        <h2 className="font-mono text-slate-100 text-xl font-extrabold uppercase mt-0.5">TERMINAL MASTERED</h2>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/60 border border-cyber-border/40 rounded p-4">
        <div className="w-16 h-16 rounded border border-dashed border-emerald-500/30 flex items-center justify-center bg-slate-950">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ASSESSMENT STATUS</span>
          <div className="text-base font-bold tracking-wider text-emerald-400">ACCESS GRANTED</div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">ALL OBJECTIVES VERIFIED</span>
        </div>
      </div>

      <div className="bg-slate-950/30 p-4 rounded border border-cyber-border/30 font-mono text-xs flex justify-between items-center">
        <span className="text-slate-500 font-semibold uppercase">FINAL CLEARANCE SCORE:</span>
        <span className="text-emerald-400 font-extrabold text-sm">{score} PTS</span>
      </div>

      <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-200 text-left font-sans font-medium">
        <p className="text-emerald-400 font-mono">
          You can now navigate the shell, create and manage files and directories, and find help when stuck. These are
          the foundations every Sentinel operator builds on.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs py-3 px-3 rounded border border-cyber-border hover:border-emerald-500/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          REPLAY
        </button>
        <button
          onClick={() => {
            sound.playClick();
            alert('CLASSIFIED: Transitioning to Module 3 node...');
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-3 px-3 rounded border border-emerald-500 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          PROCEED
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 9. ORCHESTRATOR
// ==========================================
function Modul2Game() {
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'FINISHED'>('INTRO');
  const [finalScore, setFinalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMute(nextMute);
    sound.playClick();
  };

  const handleFinished = (score: number) => {
    setFinalScore(score);
    setGameState('FINISHED');
  };

  return (
    <div className="w-full relative min-h-screen flex flex-col justify-between crt-overlay">
      <TelemetryOverlay />

      <main className="w-full relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md text-center select-none pt-2 pb-4 font-mono">
          <div className="text-[11px] text-emerald-400/50 font-bold tracking-[0.25em] uppercase">PROJECT SENTINEL</div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1">FIELD ASSESSMENT 02</div>
        </div>

        {gameState === 'INTRO' && (
          <IntroScreen onStart={() => setGameState('PLAYING')} isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {gameState === 'PLAYING' && (
          <GameScreen isMuted={isMuted} onToggleMute={handleToggleMute} onFinished={handleFinished} />
        )}

        {gameState === 'FINISHED' && (
          <EndScreen score={finalScore} onRestart={() => setGameState('INTRO')} />
        )}
      </main>

      <footer className="relative z-10 py-2.5 border-t border-cyber-border/30 text-center font-mono text-[9px] text-slate-600 select-none bg-slate-950/20 backdrop-blur-sm">
        SECURE TRAINING CORE // LIVE SHELL ENGAGED
      </footer>
    </div>
  );
}

export default Modul2Game;
