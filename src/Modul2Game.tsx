import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, RefreshCw, Terminal, ChevronRight, CheckCircle2,
  Folder, FolderOpen, FileText, Lightbulb, Target, CornerDownLeft, Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// 1. SYNTHESIZED SOUND SYSTEM (Web Audio API)
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('sentinel_sound_muted') === 'true';
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
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

  public playKey() { this.tone('square', 420, 520, 0.03, 0.012); }
  public playClick() { this.tone('sine', 800, 1200, 0.05, 0.04); }
  public playRun() { this.tone('sine', 480, 600, 0.06, 0.035); }
  public playError() { this.tone('sawtooth', 160, 70, 0.2, 0.07); }
  public playReveal() { this.tone('triangle', 700, 980, 0.12, 0.04); }

  public playSector() {
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
// 2. VIRTUAL FILE SYSTEM + SHELL ENGINE
// ==========================================
interface FileNode { type: 'file'; content: string; hidden?: boolean }
interface DirNode { type: 'dir'; hidden?: boolean; children: Record<string, FsNode> }
type FsNode = FileNode | DirNode;

const HOME = '/home/agent';

const dir = (children: Record<string, FsNode>, hidden = false): DirNode => ({ type: 'dir', hidden, children });
const file = (content: string, hidden = false): FileNode => ({ type: 'file', content, hidden });

const clone = (fs: DirNode): DirNode => JSON.parse(JSON.stringify(fs)) as DirNode;
const splitPath = (p: string): string[] => p.split('/').filter(Boolean);
const join = (parent: string, name: string): string => (parent === '' || parent === '/' ? `/${name}` : `${parent}/${name}`);
const ancestorPaths = (abs: string): string[] => {
  const res: string[] = [];
  let cur = '';
  for (const s of splitPath(abs)) {
    cur += `/${s}`;
    res.push(cur);
  }
  return res;
};

const resolvePath = (cwd: string, target: string): string => {
  let base: string[];
  if (!target || target === '.') return cwd;
  let t = target;
  if (t === '~' || t.startsWith('~/')) {
    base = splitPath(HOME);
    t = t.slice(1).replace(/^\//, '');
  } else if (t.startsWith('/')) {
    base = [];
  } else {
    base = splitPath(cwd);
  }
  for (const seg of splitPath(t)) {
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

const exists = (fs: DirNode, path: string) => getNode(fs, path) !== null;

interface ParsedCmd { cmd: string; flags: Set<string>; longFlags: Set<string>; args: string[] }
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

interface ExecResult { fs: DirNode; cwd: string; output: string[]; clear?: boolean; isError: boolean }

const MANUALS: Record<string, string> = {
  ls: 'ls - list directory contents\n  -a, --all   include entries starting with .\n  -l          long listing format',
  cd: 'cd - change directory\n  cd <dir>   enter a directory\n  cd ..      go up one level\n  cd ~       go home',
  pwd: 'pwd - print the current working directory',
  cat: 'cat <file> - print a file to the screen',
  mkdir: 'mkdir <name> - create a new directory',
  touch: 'touch <file> - create a new empty file',
  cp: 'cp <source> <dest> - copy a file',
  mv: 'mv <source> <dest> - move or rename a file',
  rm: 'rm <file> - delete a file\n  rm -r <dir>   delete a directory and its contents',
};

const ALL_COMMANDS = ['ls', 'cd', 'pwd', 'cat', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'echo', 'man', 'clear', 'help'];

const execute = (raw: string, fsIn: DirNode, cwd: string): ExecResult => {
  const fs = clone(fsIn);
  const { cmd, flags, longFlags, args } = parse(raw);
  const err = (m: string): ExecResult => ({ fs: fsIn, cwd, output: [m], isError: true });

  if (longFlags.has('help')) {
    return { fs: fsIn, cwd, output: [MANUALS[cmd] ?? 'No quick help available for this command.'], isError: false };
  }

  switch (cmd) {
    case '':
      return { fs: fsIn, cwd, output: [], isError: false };
    case 'help':
      return { fs: fsIn, cwd, output: ['Commands: ' + ALL_COMMANDS.join('  '), "Tip: 'man <command>' or '<command> --help'."], isError: false };
    case 'clear':
      return { fs: fsIn, cwd, output: [], clear: true, isError: false };
    case 'pwd':
      return { fs: fsIn, cwd, output: [cwd], isError: false };
    case 'echo':
      return { fs: fsIn, cwd, output: [args.join(' ')], isError: false };
    case 'man': {
      if (!args[0]) return err('What manual page do you want?');
      const man = MANUALS[args[0]];
      return man ? { fs: fsIn, cwd, output: man.split('\n'), isError: false } : err(`No manual entry for ${args[0]}`);
    }
    case 'ls': {
      const targetPath = resolvePath(cwd, args[0] ?? '.');
      const node = getNode(fs, targetPath);
      if (!node) return err(`ls: cannot access '${args[0]}': No such file or directory`);
      if (node.type === 'file') return { fs: fsIn, cwd, output: [args[0] ?? ''], isError: false };
      const showHidden = flags.has('a') || longFlags.has('all');
      let names = Object.keys(node.children).filter((n) => showHidden || !node.children[n].hidden);
      names.sort();
      if (showHidden) names = ['.', '..', ...names];
      if (flags.has('l')) {
        const lines = names.map((n) => {
          if (n === '.' || n === '..') return `drwxr-xr-x  agent  ${n}`;
          const c = node.children[n];
          return `${c.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'}  agent  ${n}`;
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
    case 'cat': {
      if (!args[0]) return err('cat: missing file operand');
      const node = getNode(fs, resolvePath(cwd, args[0]));
      if (!node) return err(`cat: ${args[0]}: No such file or directory`);
      if (node.type === 'dir') return err(`cat: ${args[0]}: Is a directory`);
      return { fs: fsIn, cwd, output: node.content ? node.content.split('\n') : [''], isError: false };
    }
    case 'mkdir': {
      if (!args[0]) return err('mkdir: missing operand');
      const path = resolvePath(cwd, args[0]);
      const { dir: parent, name } = getParentDir(fs, path);
      if (!parent) return err(`mkdir: cannot create directory '${args[0]}': No such file or directory`);
      if (parent.children[name]) return err(`mkdir: cannot create directory '${args[0]}': File exists`);
      parent.children[name] = dir({});
      return { fs, cwd, output: [], isError: false };
    }
    case 'touch': {
      if (!args[0]) return err('touch: missing file operand');
      const path = resolvePath(cwd, args[0]);
      const { dir: parent, name } = getParentDir(fs, path);
      if (!parent) return err(`touch: cannot touch '${args[0]}': No such file or directory`);
      if (!parent.children[name]) parent.children[name] = file('', name.startsWith('.'));
      return { fs, cwd, output: [], isError: false };
    }
    case 'cp': {
      if (args.length < 2) return err('cp: missing destination file operand');
      const src = getNode(fs, resolvePath(cwd, args[0]));
      if (!src) return err(`cp: cannot stat '${args[0]}': No such file or directory`);
      if (src.type === 'dir') return err(`cp: -r not specified; omitting directory '${args[0]}'`);
      const { dir: dst, name } = getParentDir(fs, resolvePath(cwd, args[1]));
      if (!dst) return err(`cp: cannot create regular file '${args[1]}': No such file or directory`);
      dst.children[name] = file(src.content, name.startsWith('.'));
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
      if (node.type === 'dir' && !flags.has('r')) return err(`rm: cannot remove '${args[0]}': Is a directory`);
      const { dir: parent, name } = getParentDir(fs, path);
      if (parent) delete parent.children[name];
      return { fs, cwd, output: [], isError: false };
    }
    default:
      return err(`bash: ${cmd}: command not found`);
  }
};

const sameStructure = (a: FsNode, b: FsNode): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'dir' && b.type === 'dir') {
    const ak = Object.keys(a.children).sort();
    const bk = Object.keys(b.children).sort();
    if (ak.length !== bk.length || ak.some((k, i) => k !== bk[i])) return false;
    return ak.every((k) => sameStructure(a.children[k], (b as DirNode).children[k]));
  }
  return true;
};

// ==========================================
// 3. LEVELS (SECTORS)
// ==========================================
interface LogEntry { cmd: string; args: string[]; output: string; isError: boolean }
interface LevelState { fs: DirNode; cwd: string; log: LogEntry[] }
interface Level {
  id: number;
  codename: string;
  brief: string;
  objective: string;
  hint: string;
  fog: boolean;
  par: number;
  buildFs: () => DirNode;
  startCwd: string;
  target?: () => DirNode;
  isComplete: (s: LevelState) => boolean;
  success: string;
}

const levels: Level[] = [
  {
    id: 1,
    codename: 'SECTOR 01 · RECON',
    brief:
      "You've breached Obsidian's file server. An access keycard is hidden somewhere in the directory tree. Explore the system, read the clues, and recover it.",
    objective: 'Find and read the file containing the ACCESS CODE.',
    hint: "Use 'ls' to look around, 'cat notes.txt' to read clues, and 'cd <dir>' to dig deeper.",
    fog: true,
    par: 8,
    startCwd: HOME,
    buildFs: () =>
      dir({
        home: dir({
          agent: dir({
            'notes.txt': file('RECON LOG\nThe keycard is filed inside the server vault.\nLook around with ls, then cd into "server".'),
            server: dir({
              logs: dir({ 'access.log': file('192.168.0.4 connected'), 'error.log': file('no errors') }),
              public: dir({ 'index.html': file('<h1>Obsidian</h1>'), 'style.css': file('body{}') }),
              vault: dir({ 'keycard.txt': file('ACCESS CODE: 7F3A-9920\nKeycard recovered. Sector secure.') }),
            }),
          }),
        }),
      }),
    isComplete: ({ log }) => log.some((e) => e.cmd === 'cat' && e.output.includes('ACCESS CODE')),
    success: 'Keycard recovered. Access code 7F3A-9920 logged.',
  },
  {
    id: 2,
    codename: 'SECTOR 02 · SHADOWS',
    brief:
      'Obsidian conceals its real intel as hidden files — names that start with a dot. A normal listing will walk right past them. Uncover the hidden intel.',
    objective: 'Reveal the hidden files and read the concealed INTEL.',
    hint: "Hidden files start with '.'. A plain 'ls' skips them — try 'ls -a' to reveal them.",
    fog: true,
    par: 8,
    startCwd: HOME,
    buildFs: () =>
      dir({
        home: dir({
          agent: dir({
            'memo.txt': file('Obsidian hides intel as dotfiles. Enter "data" and reveal what a normal ls hides.'),
            data: dir({
              'report.txt': file('Routine logistics report. Nothing useful.'),
              '.stash': dir(
                { '.intel.txt': file('INTEL: Obsidian command node located at grid 51N. Sector secure.', true) },
                true,
              ),
            }),
          }),
        }),
      }),
    isComplete: ({ log }) => log.some((e) => e.cmd === 'cat' && e.output.includes('INTEL')),
    success: 'Hidden intel decrypted. Obsidian command node exposed.',
  },
  {
    id: 3,
    codename: 'SECTOR 03 · ARCHITECT',
    brief:
      'To plant a decoy, you must rebuild an exact directory structure. The TARGET layout is shown on the right. Recreate it under your home folder in as few moves as possible.',
    objective: "Make your filesystem match the TARGET layout exactly.",
    hint: "Build top-down: 'mkdir mission', then 'touch mission/brief.txt', 'mkdir mission/evidence', and so on.",
    fog: false,
    par: 6,
    startCwd: HOME,
    buildFs: () => dir({ home: dir({ agent: dir({}) }) }),
    target: () =>
      dir({
        mission: dir({
          'brief.txt': file(''),
          evidence: dir({ 'photo1.txt': file(''), 'photo2.txt': file('') }),
        }),
      }),
    isComplete: ({ fs }) => {
      const agent = getNode(fs, HOME);
      const target = levels[2].target!();
      return agent !== null && agent.type === 'dir' && sameStructure(agent, target);
    },
    success: 'Decoy structure deployed. Layout matches specification.',
  },
  {
    id: 4,
    codename: 'SECTOR 04 · EXTRACTION',
    brief:
      'Final step. Exfiltrate the intel file into your loot folder, then destroy the entire Obsidian directory to erase your tracks before you disconnect.',
    objective: 'Copy obsidian/intel.dat into loot/, then remove the whole obsidian directory.',
    hint: "Use 'cp obsidian/intel.dat loot/intel.dat' to exfiltrate, then 'rm -r obsidian' to wipe the directory and everything in it.",
    fog: false,
    par: 3,
    startCwd: HOME,
    buildFs: () =>
      dir({
        home: dir({
          agent: dir({
            loot: dir({}),
            obsidian: dir({
              'intel.dat': file('Obsidian operative roster + safehouse coordinates.'),
              'trace.log': file('session traces...'),
              cache: dir({ 'tmp1.bin': file('...'), 'tmp2.bin': file('...') }),
            }),
          }),
        }),
      }),
    isComplete: ({ fs }) => exists(fs, `${HOME}/loot/intel.dat`) && !exists(fs, `${HOME}/obsidian`),
    success: 'Intel secured. Obsidian directory wiped. Extraction complete.',
  },
];

const QUICK_COMMANDS = ['ls', 'ls -a', 'cd', 'cat', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'rm -r', 'man'];

const initialReveal = (lvl: Level): Set<string> => {
  const set = new Set<string>();
  if (lvl.fog) ancestorPaths(lvl.startCwd).forEach((p) => set.add(p));
  return set;
};

const levelScore = (par: number, moves: number): number => 200 + Math.max(0, par - moves) * 25;

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
interface IntroScreenProps { onStart: () => void; isMuted: boolean; onToggleMute: () => void }

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, isMuted, onToggleMute }) => (
  <div className="w-full max-w-xl bg-cyber-card/95 border-2 border-emerald-500 rounded-lg p-6 shadow-[0_0_20px_rgba(16,185,129,0.35)] text-center relative overflow-hidden backdrop-blur-md">
    <div className="flex justify-between items-center mb-5 border-b border-cyber-border/40 pb-3">
      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-mono tracking-widest font-bold">
        <Terminal className="w-4 h-4" />
        PROJECT SENTINEL
      </div>
      <button onClick={onToggleMute} className="p-1.5 rounded border border-cyber-border/80 text-slate-400 hover:text-emerald-400 cursor-pointer">
        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
      </button>
    </div>

    <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 uppercase">FIELD ASSESSMENT 02</h1>
    <h2 className="font-mono text-emerald-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase">Mission: Obsidian Infiltration</h2>

    <div className="mt-6 space-y-5">
      <div className="bg-slate-950/60 border border-cyber-border/40 rounded p-5 text-left space-y-4 max-h-[360px] overflow-y-auto pr-1">
        <p className="text-slate-300 font-sans text-sm leading-relaxed">
          You've slipped into Obsidian's Linux file server. Work through <span className="text-emerald-400 font-mono">4 sectors</span> — each a
          self-contained hacking puzzle. There's no script to follow: read the clues and use the shell to figure it out.
        </p>

        <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
          <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">THE SECTORS</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[13px] font-sans">
            <li><span className="text-emerald-400">Recon</span> — hunt a hidden keycard through the directory maze.</li>
            <li><span className="text-emerald-400">Shadows</span> — uncover intel concealed in hidden files.</li>
            <li><span className="text-emerald-400">Architect</span> — rebuild a target directory layout.</li>
            <li><span className="text-emerald-400">Extraction</span> — exfiltrate the intel and wipe your tracks.</li>
          </ul>
        </div>

        <div className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1">
          <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold font-mono">SCORING</p>
          <p className="text-slate-400 text-[13px] font-sans">
            Clear each sector in as few commands as possible. Beat the <span className="text-emerald-400 font-mono">par</span> for bonus clearance points. Stuck? A hint is always one click away — no penalty.
          </p>
        </div>
      </div>

      <button
        onClick={() => { sound.playRun(); onStart(); }}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm tracking-widest py-3 rounded border border-emerald-500 shadow-md cursor-pointer transition-all uppercase"
      >
        BEGIN INFILTRATION
      </button>
    </div>
  </div>
);

// ==========================================
// 6. FILESYSTEM TREE (with fog-of-war)
// ==========================================
interface TreeProps { node: DirNode; name: string; path: string; cwd: string; revealed: Set<string>; fog: boolean; depth: number }

const FsTree: React.FC<TreeProps> = ({ node, name, path, cwd, revealed, fog, depth }) => {
  const isCwd = path === cwd || (path === '' && cwd === '/');
  const childNames = Object.keys(node.children)
    .filter((cn) => (fog ? revealed.has(join(path, cn)) : true))
    .sort();
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 rounded px-1 ${isCwd ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400'}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isCwd ? <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
        <span className={`truncate ${node.hidden ? 'italic opacity-70' : ''}`}>{name}</span>
        {isCwd && <span className="text-[8px] text-emerald-500 font-bold ml-auto pr-1">YOU ARE HERE</span>}
      </div>
      {childNames.map((cn) => {
        const child = node.children[cn];
        const childPath = join(path, cn);
        if (child.type === 'dir') {
          return <FsTree key={cn} node={child} name={cn} path={childPath} cwd={cwd} revealed={revealed} fog={fog} depth={depth + 1} />;
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

// Static target tree (always fully shown, no cwd highlight)
const TargetTree: React.FC<{ node: DirNode; name: string; depth: number }> = ({ node, name, depth }) => (
  <div>
    <div className="flex items-center gap-1.5 py-0.5 text-amber-300/90" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
      <Folder className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </div>
    {Object.keys(node.children).sort().map((cn) => {
      const child = node.children[cn];
      if (child.type === 'dir') return <TargetTree key={cn} node={child} name={cn} depth={depth + 1} />;
      return (
        <div key={cn} className="flex items-center gap-1.5 py-0.5 text-amber-200/60" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{cn}</span>
        </div>
      );
    })}
  </div>
);

// ==========================================
// 7. GAME SCREEN
// ==========================================
interface TermLine { id: string; kind: 'cmd' | 'out' | 'err' | 'sys'; text: string }
interface GameScreenProps { isMuted: boolean; onToggleMute: () => void; onFinished: (score: number) => void }

const GameScreen: React.FC<GameScreenProps> = ({ isMuted, onToggleMute, onFinished }) => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [fs, setFs] = useState<DirNode>(() => levels[0].buildFs());
  const [cwd, setCwd] = useState<string>(levels[0].startCwd);
  const [revealed, setRevealed] = useState<Set<string>>(() => initialReveal(levels[0]));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TermLine[]>([
    { id: 'b', kind: 'sys', text: `>> ${levels[0].codename} engaged. Type 'help' for available commands.` },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);

  const fsRef = useRef<DirNode>(fs);
  const cwdRef = useRef<string>(cwd);
  const revealedRef = useRef<Set<string>>(revealed);
  const logRef = useRef<LogEntry[]>([]);
  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const levelIndexRef = useRef(0);
  const advancingRef = useRef(false);

  const level = levels[levelIndex];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const prompt = (path: string) => `agent@obsidian:${path.replace(HOME, '~')}$`;

  const pushLines = (entries: Omit<TermLine, 'id'>[]) =>
    setLines((prev) => [...prev, ...entries.map((e) => ({ ...e, id: `l${lineId.current++}` }))]);

  const applyReveal = (parsed: ParsedCmd, beforeCwd: string, afterCwd: string, resultFs: DirNode) => {
    const next = new Set(revealedRef.current);
    let changed = false;
    const add = (p: string) => {
      if (!next.has(p)) {
        next.add(p);
        changed = true;
      }
    };
    if (parsed.cmd === 'ls') {
      const targetPath = resolvePath(beforeCwd, parsed.args[0] ?? '.');
      ancestorPaths(targetPath).forEach(add);
      const node = getNode(resultFs, targetPath);
      if (node && node.type === 'dir') {
        const showHidden = parsed.flags.has('a') || parsed.longFlags.has('all');
        Object.keys(node.children).forEach((n) => {
          if (showHidden || !node.children[n].hidden) add(join(targetPath, n));
        });
      }
    } else if (parsed.cmd === 'cd') {
      ancestorPaths(afterCwd).forEach(add);
    } else if (parsed.cmd === 'mkdir' || parsed.cmd === 'touch') {
      ancestorPaths(resolvePath(beforeCwd, parsed.args[0] ?? '')).forEach(add);
    }
    if (changed) {
      revealedRef.current = next;
      setRevealed(next);
      sound.playReveal();
    }
  };

  const loadLevel = (i: number) => {
    const lvl = levels[i];
    fsRef.current = lvl.buildFs();
    cwdRef.current = lvl.startCwd;
    revealedRef.current = initialReveal(lvl);
    logRef.current = [];
    movesRef.current = 0;
    advancingRef.current = false;
    setFs(fsRef.current);
    setCwd(cwdRef.current);
    setRevealed(revealedRef.current);
    setMoves(0);
    setShowHint(false);
    setCleared(false);
    setLevelIndex(i);
    levelIndexRef.current = i;
    setLines([{ id: `b${lineId.current++}`, kind: 'sys', text: `>> ${lvl.codename} engaged.` }]);
  };

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    pushLines([{ kind: 'cmd', text: `${prompt(cwdRef.current)} ${trimmed}` }]);
    if (!trimmed) return;

    const beforeCwd = cwdRef.current;
    const result = execute(trimmed, fsRef.current, beforeCwd);

    if (result.clear) {
      setLines([]);
      return;
    }

    if (result.output.length) {
      pushLines(result.output.map((t) => ({ kind: result.isError ? 'err' : 'out', text: t }) as Omit<TermLine, 'id'>));
    }

    const parsed = parse(trimmed);
    fsRef.current = result.fs;
    cwdRef.current = result.cwd;
    setFs(result.fs);
    setCwd(result.cwd);

    if (result.isError) {
      sound.playError();
      return;
    }
    sound.playRun();

    movesRef.current += 1;
    setMoves(movesRef.current);

    logRef.current = [
      ...logRef.current,
      { cmd: parsed.cmd, args: parsed.args, output: result.output.join('\n'), isError: false },
    ];

    const activeLevel = levels[levelIndexRef.current];
    if (activeLevel.fog) applyReveal(parsed, beforeCwd, result.cwd, result.fs);

    if (!advancingRef.current && activeLevel.isComplete({ fs: result.fs, cwd: result.cwd, log: logRef.current })) {
      advancingRef.current = true;
      const gained = levelScore(activeLevel.par, movesRef.current);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setShowHint(false);
      setCleared(true);
      sound.playSector();
      pushLines([
        { kind: 'sys', text: `>> ${activeLevel.success}` },
        { kind: 'sys', text: `>> SECTOR CLEARED  ·  +${gained} pts  (par ${activeLevel.par}, used ${movesRef.current})` },
      ]);

      window.setTimeout(() => {
        if (levelIndexRef.current >= levels.length - 1) onFinished(scoreRef.current);
        else loadLevel(levelIndexRef.current + 1);
      }, 1500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input;
    setInput('');
    runCommand(value);
  };

  const progress = Math.round(((levelIndex + (cleared ? 1 : 0)) / levels.length) * 100);

  return (
    <div className="relative w-full max-w-5xl bg-cyber-card/95 border border-cyber-border rounded-lg p-3 sm:p-4 shadow-2xl backdrop-blur-md">
      {/* HUD */}
      <div className="w-full bg-cyber-card/90 border border-cyber-border rounded-lg p-3 flex justify-between items-center font-mono text-xs shadow-md select-none mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CLEARANCE</span>
          <span className="text-emerald-400 font-bold text-sm text-glow-green">{score} PTS</span>
        </div>
        <div className="flex flex-col items-center flex-1 px-4 max-w-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SECTOR {levelIndex + 1} / {levels.length}</span>
          <div className="w-full bg-slate-950 border border-cyber-border rounded h-1.5 mt-1 overflow-hidden">
            <div className="h-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MOVES</span>
            <span className="text-emerald-400 font-bold text-sm">{moves} <span className="text-slate-500">/ par {level.par}</span></span>
          </div>
          <button onClick={onToggleMute} className="p-1.5 rounded text-slate-400 hover:text-emerald-400 cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Sector briefing */}
      <AnimatePresence mode="wait">
        <motion.div
          key={level.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-3 rounded-md border p-3 ${cleared ? 'border-emerald-500 bg-emerald-950/40' : 'border-emerald-500/40 bg-slate-950/60'}`}
        >
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">{level.codename}</span>
              <p className="text-slate-300 text-[13px] font-sans mt-1 leading-relaxed">{level.brief}</p>
              <p className="text-emerald-300/90 text-[12px] font-mono mt-1.5 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> {level.objective}
              </p>
              <AnimatePresence>
                {showHint && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                    <div className="bg-slate-950 border border-amber-400/30 rounded px-3 py-2 text-xs">
                      <p className="text-amber-200/90 font-sans">{level.hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => { sound.playClick(); setShowHint((s) => !s); }}
              className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-300 border border-amber-400/40 rounded px-2 py-1 hover:bg-amber-400/10 cursor-pointer shrink-0"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {showHint ? 'Hide' : 'Hint'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Terminal + panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 flex flex-col bg-slate-950 border border-cyber-border/60 rounded-md overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-cyber-border/50 bg-cyber-card/60">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></span>
            <span className="ml-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">agent@obsidian — secure shell</span>
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
                  l.kind === 'cmd' ? 'text-slate-200' : l.kind === 'err' ? 'text-red-400' : l.kind === 'sys' ? 'text-emerald-400' : 'text-slate-400'
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
                onChange={(e) => { setInput(e.target.value); sound.playKey(); }}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent outline-none text-emerald-200 caret-emerald-400"
              />
            </form>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-cyber-border/50 bg-cyber-card/40">
            {QUICK_COMMANDS.map((c) => (
              <button
                key={c}
                onClick={() => { sound.playClick(); setInput((prev) => (prev ? `${prev} ${c}` : `${c} `)); inputRef.current?.focus(); }}
                className="text-[10px] font-mono text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 hover:bg-emerald-500/10 cursor-pointer"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: map (+ target) */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-950 border border-cyber-border/60 rounded-md overflow-hidden flex flex-col flex-1">
            <div className="px-3 py-1.5 border-b border-cyber-border/50 bg-cyber-card/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">{level.fog ? 'Map (explored)' : 'Filesystem'}</span>
              <span className="text-[9px] font-mono text-slate-500 truncate max-w-[55%]">{cwd.replace(HOME, '~')}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 font-mono text-[11px] min-h-[120px]">
              <FsTree node={fs} name="/" path="" cwd={cwd} revealed={revealed} fog={level.fog} depth={0} />
            </div>
          </div>

          {level.target && (
            <div className="bg-slate-950 border border-amber-400/30 rounded-md overflow-hidden flex flex-col">
              <div className="px-3 py-1.5 border-b border-amber-400/20 bg-cyber-card/60">
                <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold">Target layout</span>
              </div>
              <div className="overflow-y-auto px-2 py-2 font-mono text-[11px]">
                <TargetTree node={level.target()} name="agent" depth={0} />
              </div>
            </div>
          )}
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
const EndScreen: React.FC<{ score: number; onRestart: () => void }> = ({ score, onRestart }) => {
  useEffect(() => {
    sound.playVictory();
    confetti({ particleCount: 140, spread: 78, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#a258ff'] });
  }, []);

  return (
    <div className="w-full max-w-md bg-cyber-card/95 border border-cyber-border rounded-lg p-6 shadow-2xl space-y-6 backdrop-blur-md relative select-none">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
      <div className="text-center border-b border-cyber-border/40 pb-3">
        <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">INFILTRATION COMPLETE</span>
        <h2 className="font-mono text-slate-100 text-xl font-extrabold uppercase mt-0.5">OBSIDIAN BREACHED</h2>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/60 border border-cyber-border/40 rounded p-4">
        <div className="w-16 h-16 rounded border border-dashed border-emerald-500/30 flex items-center justify-center bg-slate-950">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">STATUS</span>
          <div className="text-base font-bold tracking-wider text-emerald-400">ALL SECTORS CLEARED</div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">EXTRACTION SUCCESSFUL</span>
        </div>
      </div>

      <div className="bg-slate-950/30 p-4 rounded border border-cyber-border/30 font-mono text-xs flex justify-between items-center">
        <span className="text-slate-500 font-semibold uppercase">FINAL CLEARANCE SCORE:</span>
        <span className="text-emerald-400 font-extrabold text-sm">{score} PTS</span>
      </div>

      <div className="bg-slate-950/80 p-4 rounded text-xs leading-relaxed text-slate-200 text-left font-sans font-medium">
        <p className="text-emerald-400 font-mono">
          You navigated the shell, uncovered hidden files, built directory structures, and managed files under pressure — the
          core skills every Sentinel operator relies on.
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={onRestart} className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs py-3 px-3 rounded border border-cyber-border hover:border-emerald-500/50 cursor-pointer flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          REPLAY
        </button>
        <button
          onClick={() => { sound.playClick(); alert('CLASSIFIED: Transitioning to Module 3 node...'); }}
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
    const next = !isMuted;
    setIsMuted(next);
    sound.setMute(next);
    sound.playClick();
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
          <GameScreen isMuted={isMuted} onToggleMute={handleToggleMute} onFinished={(s) => { setFinalScore(s); setGameState('FINISHED'); }} />
        )}
        {gameState === 'FINISHED' && <EndScreen score={finalScore} onRestart={() => setGameState('INTRO')} />}
      </main>

      <footer className="relative z-10 py-2.5 border-t border-cyber-border/30 text-center font-mono text-[9px] text-slate-600 select-none bg-slate-950/20 backdrop-blur-sm">
        SECURE TRAINING CORE // LIVE SHELL ENGAGED
      </footer>
    </div>
  );
}

export default Modul2Game;
