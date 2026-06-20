import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw, ChevronRight, CheckCircle2, Server, HelpCircle, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

// ==========================================
// SYNTHESIZED SOUND SYSTEM (Web Audio API)
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('sentinel_sound_muted');
    this.isMuted = savedMute === 'true';
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn(e);
    }
  }

  public playSnap() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn(e);
    }
  }

  public playIncorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.setValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn(e);
    }
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [349.23, 440.00, 523.25, 698.46];
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.16);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

const sound = new SoundManager();

// ==========================================
// BACKGROUND VISUAL OVERLAY
// ==========================================
const TelemetryOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none matrix-bg-green">
      <div className="absolute inset-0 cyber-grid-green opacity-30"></div>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500/5 shadow-[0_0_6px_rgba(16,185,129,0.2)] animate-scanline"></div>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-emerald-500/20"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-emerald-500/20"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-emerald-500/20"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-emerald-500/20"></div>
    </div>
  );
};

// ==========================================
// TYPES & CONSTANTS
// ==========================================
type Round = 'INTRO' | 'ROUND_1' | 'ROUND_2' | 'ROUND_3' | 'SPEED_ROUND' | 'FINAL';

interface DeliveryRequest {
  id: string;
  domain: string;
  ip: string;
  delivered: boolean;
}

interface SpeedItem {
  domain: string;
  ip: string;
}

const speedQueue: SpeedItem[] = [
  { domain: 'sentinel.com', ip: '104.26.5.20' },
  { domain: 'news.net', ip: '172.16.8.15' },
  { domain: 'intel.org', ip: '192.168.1.10' },
  { domain: 'sentinel.com', ip: '104.26.5.20' },
  { domain: 'news.net', ip: '172.16.8.15' },
];

export default function Modul7Game() {
  const [round, setRound] = useState<Round>('INTRO');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  // Round 1 Delivery State
  const [requests, setRequests] = useState<DeliveryRequest[]>([
    { id: 'req1', domain: 'sentinel.com', ip: '104.26.5.20', delivered: false },
    { id: 'req2', domain: 'news.net', ip: '172.16.8.15', delivered: false },
    { id: 'req3', domain: 'intel.org', ip: '192.168.1.10', delivered: false },
  ]);

  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  // Round 2 Emergency State
  const [round2Option, setRound2Option] = useState<string | null>(null);
  const [round2Answered, setRound2Answered] = useState(false);
  const [round2Correct, setRound2Correct] = useState<boolean | null>(null);
  const [round2Processing, setRound2Processing] = useState(false);

  // Round 3 Failure State
  const [round3Option, setRound3Option] = useState<string | null>(null);
  const [round3Answered, setRound3Answered] = useState(false);
  const [round3Correct, setRound3Correct] = useState<boolean | null>(null);

  // Speed Round State
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0); // 0 to 5
  const [speedActive, setSpeedActive] = useState(false);
  const [speedProgress, setSpeedProgress] = useState(100);

  // Toggle audio state
  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sound.setMute(nextVal);
  };

  const handleStartGame = () => {
    sound.playClick();
    setRound('ROUND_1');
    resetRoundStates();
  };

  const resetRoundStates = () => {
    setRequests([
      { id: 'req1', domain: 'sentinel.com', ip: '104.26.5.20', delivered: false },
      { id: 'req2', domain: 'news.net', ip: '172.16.8.15', delivered: false },
      { id: 'req3', domain: 'intel.org', ip: '192.168.1.10', delivered: false },
    ]);
    setSelectedDomainId(null);
    setRound2Option(null);
    setRound2Answered(false);
    setRound2Correct(null);
    setRound2Processing(false);
    setRound3Option(null);
    setRound3Answered(false);
    setRound3Correct(null);
    setSpeedIndex(0);
    setSpeedScore(0);
    setSpeedActive(false);
    setSpeedProgress(100);
  };

  // Round 1 click-to-connect fallback
  const handleDomainClick = (id: string) => {
    sound.playClick();
    setSelectedDomainId(id);
  };

  const handleIpClick = (ip: string) => {
    if (!selectedDomainId) return;
    const req = requests.find(r => r.id === selectedDomainId);
    if (req && req.ip === ip) {
      sound.playSuccess();
      setRequests(prev =>
        prev.map(r => (r.id === selectedDomainId ? { ...r, delivered: true } : r))
      );
    } else {
      sound.playIncorrect();
    }
    setSelectedDomainId(null);
  };

  // Round 1 Drag physics drop validation
  const handleDragEnd = (_event: any, info: any, reqId: string, correctIp: string) => {
    // Find target IP elements bounding boxes to determine drop zone
    const targetMap = [
      { id: 'target-ip1', ip: '104.26.5.20' },
      { id: 'target-ip2', ip: '172.16.8.15' },
      { id: 'target-ip3', ip: '192.168.1.10' },
    ];

    let droppedIp: string | null = null;

    for (const t of targetMap) {
      const el = document.getElementById(t.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const px = info.point.x;
        const py = info.point.y;
        if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
          droppedIp = t.ip;
          break;
        }
      }
    }

    if (droppedIp) {
      if (droppedIp === correctIp) {
        sound.playSuccess();
        setRequests(prev =>
          prev.map(r => (r.id === reqId ? { ...r, delivered: true } : r))
        );
      } else {
        sound.playIncorrect();
      }
    } else {
      sound.playClick();
    }
    setSelectedDomainId(null);
  };

  const allDeliveredR1 = requests.every(r => r.delivered);

  // Evaluate Round 2 Selection
  const handleRound2Select = (option: string) => {
    if (round2Answered) return;
    setRound2Option(option);
    setRound2Answered(true);

    if (option === 'ask') {
      sound.playSuccess();
      setRound2Correct(true);
      setRound2Processing(true);
      setTimeout(() => {
        setRound2Processing(false);
      }, 1500);
    } else {
      sound.playIncorrect();
      setRound2Correct(false);
    }
  };

  // Evaluate Round 3 Selection
  const handleRound3Select = (option: string) => {
    if (round3Answered) return;
    setRound3Option(option);
    setRound3Answered(true);

    if (option === 'notfind') {
      sound.playSuccess();
      setRound3Correct(true);
    } else {
      sound.playIncorrect();
      setRound3Correct(false);
    }
  };

  // Speed Round matching mechanics
  const handleSpeedRoundStart = () => {
    sound.playClick();
    setSpeedActive(true);
    startSpeedTimer();
  };

  const startSpeedTimer = () => {
    setSpeedProgress(100);
  };

  // Speed timer logic
  React.useEffect(() => {
    if (!speedActive || round !== 'SPEED_ROUND') return;

    const timer = setInterval(() => {
      setSpeedProgress(prev => {
        if (prev <= 0) {
          // Time expired for this item
          sound.playIncorrect();
          handleNextSpeedItem(false);
          return 100;
        }
        return prev - 2.5; // decays in 4 seconds
      });
    }, 100);

    return () => clearInterval(timer);
  }, [speedActive, speedIndex, round]);

  const handleSpeedIpClick = (ip: string) => {
    if (!speedActive) return;
    const currentItem = speedQueue[speedIndex];
    if (currentItem.ip === ip) {
      sound.playSnap();
      setSpeedScore(prev => prev + 1);
      handleNextSpeedItem(true);
    } else {
      sound.playIncorrect();
      handleNextSpeedItem(false);
    }
  };

  const handleNextSpeedItem = (_isCorrectItem: boolean) => {
    const nextIdx = speedIndex + 1;
    if (nextIdx >= speedQueue.length) {
      setSpeedActive(false);
      sound.playSuccess();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6']
      });
      setTimeout(() => {
        setRound('FINAL');
      }, 800);
    } else {
      setSpeedIndex(nextIdx);
      setSpeedProgress(100);
    }
  };

  // Move between rounds
  const handleNextRound = () => {
    sound.playClick();
    if (round === 'ROUND_1') {
      setRound('ROUND_2');
    } else if (round === 'ROUND_2') {
      setRound('ROUND_3');
    } else if (round === 'ROUND_3') {
      setRound('SPEED_ROUND');
    }
    setSelectedDomainId(null);
  };

  const speedRoundProgressPercent = Math.round((speedScore / speedQueue.length) * 100);

  return (
    <div className="relative min-h-[580px] w-full max-w-3xl bg-cyber-bg border-2 border-emerald-500 rounded-lg p-6 overflow-hidden flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.35)] font-mono text-slate-200">
      <TelemetryOverlay />

      {/* HEADER HUD */}
      <div className="relative z-10 flex justify-between items-center border-b border-[#23123a] pb-3 mb-4 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Assessment Node 07 // Digital Addresses
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded border border-[#23123a] text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* ==========================================
              STAGE: INTRO CARD
             ========================================== */}
          {round === 'INTRO' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-[#23123a] pb-1.5">
                  <HelpCircle className="w-5 h-5 animate-pulse" />
                  <span>ADDRESS RESOLUTION PROTOCOLS</span>
                </div>
                
                <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100 text-glow-green uppercase">
                  FIELD ASSESSMENT 07
                </h1>
                <h2 className="font-mono text-emerald-400 text-xs sm:text-sm tracking-wider mt-1.5 font-semibold uppercase font-bold">
                  Mission: Internet Delivery Service
                </h2>

                <div className="bg-[#05010e] border border-[#23123a] p-4 rounded text-slate-300 text-sm leading-relaxed space-y-3 font-sans">
                  <p>
                    Sentinel needs to deliver intelligence to website nodes. The problem: the internet doesn't understand website names—it only knows numerical IP addresses.
                  </p>
                  <p>
                    <strong>Your Job:</strong> Act as the internet's delivery agent. Map website domain names to their correct numerical addresses using the DNS record book before the pipelines fail.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-widest text-sm rounded shadow-[0_0_15px_var(--color-neon-green-glow)] cursor-pointer border border-emerald-500 transition-all"
              >
                INITIALIZE DELIVERY
              </button>
            </motion.div>
          )}

          {/* ==========================================
              STAGE: ROUND 1
             ========================================== */}
          {round === 'ROUND_1' && (
            <motion.div
              key="round1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest block uppercase">
                  Round 1 // Route Domain Requests
                </span>
                <h2 className="text-sm sm:text-md text-slate-200 leading-normal">
                  Drag each website request card on the left to the correct server IP drop-target on the right, or click a card then click its target IP to establish the link.
                </h2>
              </div>

              {/* DNS GUIDANCE BOX */}
              <div className="bg-emerald-950/15 border border-emerald-800/40 p-3 rounded text-xs select-none">
                <span className="text-[9px] text-emerald-400 font-bold tracking-widest block uppercase mb-1">
                  Active DNS Record Book
                </span>
                <div className="grid grid-cols-3 gap-2 text-slate-400 font-mono text-[11px] text-center">
                  <div className="bg-black/30 border border-[#23123a] p-1.5 rounded">sentinel.com ➔ 104.26.5.20</div>
                  <div className="bg-black/30 border border-[#23123a] p-1.5 rounded">news.net ➔ 172.16.8.15</div>
                  <div className="bg-black/30 border border-[#23123a] p-1.5 rounded">intel.org ➔ 192.168.1.10</div>
                </div>
              </div>

              {/* ACTIVE MATCHING BOARD */}
              <div className="grid grid-cols-2 gap-8 py-2 relative min-h-[160px]">
                
                {/* Drag sources */}
                <div className="flex flex-col gap-3 justify-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    Incoming Requests
                  </span>
                  {requests.map((req) => (
                    <div key={req.id} className="relative h-12">
                      {!req.delivered ? (
                        <motion.div
                          drag
                          dragConstraints={{ left: 0, right: 350, top: -100, bottom: 100 }}
                          onDragEnd={(e, info) => handleDragEnd(e, info, req.id, req.ip)}
                          onClick={() => handleDomainClick(req.id)}
                          className={`border p-3 rounded text-xs font-bold font-mono cursor-grab active:cursor-grabbing shadow-sm flex items-center justify-between select-none absolute z-20 w-full transition-colors ${
                            selectedDomainId === req.id
                              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 text-glow-green animate-pulse'
                              : 'border-[#23123a] bg-slate-900/60 text-slate-200 hover:border-emerald-800'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileDrag={{ scale: 1.05, zIndex: 50 }}
                        >
                          <span>{req.domain}</span>
                          <span className="text-[9px] text-slate-500 font-normal">✉ REQUEST</span>
                        </motion.div>
                      ) : (
                        <div className="border border-green-500/20 bg-green-950/10 text-green-400 text-xs p-3 rounded flex items-center justify-between w-full font-bold select-none absolute">
                          <span className="line-through">{req.domain}</span>
                          <span className="text-[10px] text-green-400">Delivered ✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Drop targets */}
                <div className="flex flex-col gap-3 justify-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    Server Addresses
                  </span>
                  
                  <div
                    id="target-ip1"
                    onClick={() => handleIpClick('104.26.5.20')}
                    className="border border-[#23123a] bg-slate-950/80 p-3 rounded-lg text-xs font-mono flex items-center justify-between hover:border-emerald-800 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>104.26.5.20</span>
                    </div>
                    <span className="text-[9px] text-slate-600">SERVER A</span>
                  </div>

                  <div
                    id="target-ip2"
                    onClick={() => handleIpClick('172.16.8.15')}
                    className="border border-[#23123a] bg-slate-950/80 p-3 rounded-lg text-xs font-mono flex items-center justify-between hover:border-emerald-800 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>172.16.8.15</span>
                    </div>
                    <span className="text-[9px] text-slate-600">SERVER B</span>
                  </div>

                  <div
                    id="target-ip3"
                    onClick={() => handleIpClick('192.168.1.10')}
                    className="border border-[#23123a] bg-slate-950/80 p-3 rounded-lg text-xs font-mono flex items-center justify-between hover:border-emerald-800 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>192.168.1.10</span>
                    </div>
                    <span className="text-[9px] text-slate-600">SERVER C</span>
                  </div>

                </div>

              </div>

              {/* ACTION / NOTIFICATION COMPONENT */}
              <div className="space-y-4">
                {allDeliveredR1 && (
                  <div className="p-3.5 bg-green-950/15 border border-green-500/30 rounded font-sans text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="font-mono text-xs">
                      <span className="font-bold text-green-400 uppercase block">DNS Lookup Complete ✓</span>
                      <p className="text-slate-300 mt-1">
                        All website requests matched to IP addresses. Messages successfully delivered to host servers.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  {allDeliveredR1 ? (
                    <button
                      onClick={handleNextRound}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-emerald-500/20"
                    >
                      PROCEED TO ROUND 2
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-6 py-2.5 bg-slate-800 text-slate-500 rounded text-xs font-bold tracking-widest uppercase cursor-not-allowed select-none opacity-50"
                    >
                      DELIVER ALL PACKETS
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              STAGE: ROUND 2
             ========================================== */}
          {round === 'ROUND_2' && (
            <motion.div
              key="round2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest block uppercase">
                  Round 2 // DNS Emergency
                </span>
                <h2 className="text-md font-bold text-slate-100">
                  A request arrives for: <span className="text-yellow-400 text-glow-yellow">www.sentinel.com</span>
                </h2>
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded text-xs font-mono text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Unknown destination: Local browser cache signature not found.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono pt-2">
                  <button
                    onClick={() => handleRound2Select('ask')}
                    disabled={round2Answered}
                    className={`p-4 rounded border text-center text-xs tracking-wider cursor-pointer ${
                      round2Option === 'ask'
                        ? round2Correct
                          ? 'border-green-500 bg-green-950/20 text-green-300 font-bold'
                          : 'border-red-500 bg-red-950/20 text-red-300'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    Ask DNS
                  </button>
                  <button
                    onClick={() => handleRound2Select('guess')}
                    disabled={round2Answered}
                    className={`p-4 rounded border text-center text-xs tracking-wider cursor-pointer ${
                      round2Option === 'guess'
                        ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    Guess
                  </button>
                  <button
                    onClick={() => handleRound2Select('cancel')}
                    disabled={round2Answered}
                    className={`p-4 rounded border text-center text-xs tracking-wider cursor-pointer ${
                      round2Option === 'cancel'
                        ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>

                <AnimatePresence>
                  {round2Processing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-[#05010e] border border-[#23123a] rounded p-3 text-xs font-mono space-y-1.5 mt-3 select-none"
                    >
                      <span className="text-emerald-400 font-bold uppercase animate-pulse block">
                        Checking DNS root servers...
                      </span>
                      <div className="w-full bg-[#0d061a] border border-[#23123a] rounded h-2 overflow-hidden relative">
                        <motion.div
                          className="h-full bg-emerald-500 rounded"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.2 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {round2Answered && !round2Processing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-4 rounded border font-sans text-xs ${
                        round2Correct ? 'border-green-500/40 bg-green-950/10' : 'border-red-500/40 bg-red-950/10'
                      }`}
                    >
                      {round2Correct ? (
                        <div className="flex items-start gap-2.5 font-mono">
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-green-400 uppercase block">Found Address!</span>
                            <p className="text-slate-300 text-xs">
                              DNS resolved **www.sentinel.com** to IP **104.26.5.20**. Connection established successfully.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5 font-mono">
                          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-red-400 uppercase block">Routing Fault.</span>
                            <p className="text-slate-300 text-xs">
                              Incorrect. Guessing is unreliable and cancel aborts the connection. You must query the DNS server.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {!round2Correct && round2Answered && (
                  <button
                    onClick={() => {
                      setRound2Option(null);
                      setRound2Answered(false);
                      setRound2Correct(null);
                    }}
                    className="px-5 py-2.5 bg-slate-900 border border-[#23123a] text-slate-300 hover:border-emerald-400 rounded text-xs tracking-wider cursor-pointer"
                  >
                    RETRY OBJECTIVE
                  </button>
                )}
                {round2Correct && !round2Processing && (
                  <button
                    onClick={handleNextRound}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    PROCEED
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ==========================================
              STAGE: ROUND 3
             ========================================== */}
          {round === 'ROUND_3' && (
            <motion.div
              key="round3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest block uppercase">
                  Round 3 // DNS Failure
                </span>
                <h2 className="text-md font-bold text-slate-100">
                  A website request is issued, but the DNS Server is temporarily offline. What happens?
                </h2>
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded text-xs font-mono text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>DNS RESOLVER STATUS: OFFLINE ✖</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 font-mono pt-2">
                  <button
                    onClick={() => handleRound3Select('loads')}
                    disabled={round3Answered}
                    className={`p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                      round3Option === 'loads'
                        ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    A. Website loads normally
                  </button>
                  <button
                    onClick={() => handleRound3Select('notfind')}
                    disabled={round3Answered}
                    className={`p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                      round3Option === 'notfind'
                        ? 'border-green-500 bg-green-950/20 text-green-300 font-bold'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    B. Browser cannot find destination
                  </button>
                  <button
                    onClick={() => handleRound3Select('disappear')}
                    disabled={round3Answered}
                    className={`p-3.5 rounded border text-left text-xs transition-all cursor-pointer ${
                      round3Option === 'disappear'
                        ? 'border-red-500 bg-red-950/20 text-red-300 font-bold'
                        : 'border-[#23123a] bg-[#0d061a] hover:border-emerald-400 text-slate-300'
                    }`}
                  >
                    C. Server disappears from the network
                  </button>
                </div>

                <AnimatePresence>
                  {round3Answered && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-4 rounded border font-sans text-xs ${
                        round3Correct ? 'border-green-500/40 bg-green-950/10' : 'border-red-500/40 bg-red-950/10'
                      }`}
                    >
                      {round3Correct ? (
                        <div className="flex items-start gap-2.5 font-mono">
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-green-400 uppercase block">Correct!</span>
                            <p className="text-slate-300 text-xs">
                              Without DNS, names cannot be translated into addresses. The browser throws a resolution error.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5 font-mono">
                          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-red-400 uppercase block">Diagnostics Fault.</span>
                            <p className="text-slate-300 text-xs">
                              Incorrect. The target server still exists, but the browser lacks the translator capability to find it.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {!round3Correct && round3Answered && (
                  <button
                    onClick={() => {
                      setRound3Option(null);
                      setRound3Answered(false);
                      setRound3Correct(null);
                    }}
                    className="px-5 py-2.5 bg-slate-900 border border-[#23123a] text-slate-300 hover:border-emerald-400 rounded text-xs tracking-wider cursor-pointer"
                  >
                    RETRY OBJECTIVE
                  </button>
                )}
                {round3Correct && (
                  <button
                    onClick={handleNextRound}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    START SPEED ROUND
                    <ChevronRight className="w-4 h-4 animate-pulse" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ==========================================
              STAGE: SPEED ROUND
             ========================================== */}
          {round === 'SPEED_ROUND' && (
            <motion.div
              key="speed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest block uppercase animate-pulse">
                  Final Challenge // Speed Matching
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-200">
                  Match 5 incoming website names rapidly to their numerical IP addresses before the timer expires!
                </h2>

                <div className="w-full bg-[#0d061a] border border-[#23123a] p-4 rounded-lg flex flex-col justify-between items-center min-h-[140px] text-center select-none relative overflow-hidden">
                  {!speedActive ? (
                    <div className="space-y-4 py-3 flex flex-col items-center">
                      <span className="text-slate-400 text-xs font-sans">
                        Press Initialize to activate the speed queue timer.
                      </span>
                      <button
                        onClick={handleSpeedRoundStart}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider rounded border border-emerald-500 cursor-pointer shadow-md"
                      >
                        INITIALIZE TIMER
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      {/* Active queue name */}
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-0.5">
                          RESOLVING NODE ({speedIndex + 1}/5)
                        </span>
                        <div className="text-2xl font-bold tracking-wider text-emerald-300 text-glow-green">
                          {speedQueue[speedIndex].domain}
                        </div>
                      </div>

                      {/* Small inline DNS guidance cheat-sheet */}
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex gap-3 justify-center border-t border-[#23123a] pt-2">
                        <span>sentinel.com ➔ 104.26.5.20</span>
                        <span>news.net ➔ 172.16.8.15</span>
                        <span>intel.org ➔ 192.168.1.10</span>
                      </div>

                      {/* Shrunk decay timer bar */}
                      <div className="w-full bg-[#05010e] border border-[#23123a] rounded h-2 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
                          style={{ width: `${speedProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Connection Meter HUD */}
                <div className="bg-[#05010e] border border-[#23123a] p-3 rounded flex justify-between items-center text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                      Connection Meter
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">
                      Progress: {speedRoundProgressPercent}%
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-6 rounded border transition-colors ${
                          speedScore >= idx
                            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                            : 'bg-slate-900 border-[#23123a]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Match choice buttons */}
                {speedActive && (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleSpeedIpClick('104.26.5.20')}
                      className="p-3 bg-slate-900 hover:bg-emerald-950/30 border border-[#23123a] hover:border-emerald-400 text-slate-300 font-mono text-xs rounded transition-colors cursor-pointer select-none"
                    >
                      104.26.5.20
                    </button>
                    <button
                      onClick={() => handleSpeedIpClick('172.16.8.15')}
                      className="p-3 bg-slate-900 hover:bg-emerald-950/30 border border-[#23123a] hover:border-emerald-400 text-slate-300 font-mono text-xs rounded transition-colors cursor-pointer select-none"
                    >
                      172.16.8.15
                    </button>
                    <button
                      onClick={() => handleSpeedIpClick('192.168.1.10')}
                      className="p-3 bg-slate-900 hover:bg-emerald-950/30 border border-[#23123a] hover:border-emerald-400 text-slate-300 font-mono text-xs rounded transition-colors cursor-pointer select-none"
                    >
                      192.168.1.10
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==========================================
              STAGE: FINAL SUMMARY & COMPLETE
             ========================================== */}
          {round === 'FINAL' && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-5"
            >
              <div className="space-y-4">
                <div className="text-center border-b border-purple-950 pb-2 flex flex-col items-center">
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                    HANDSHAKE LINK COMPLETE // NODE RESOLVED
                  </span>
                  <h2 className="text-slate-100 text-xl font-extrabold uppercase mt-0.5 text-glow-green">
                    Internet Delivery Successful
                  </h2>
                </div>

                {/* Diagram workflow */}
                <div className="bg-[#0d061a] border border-green-500 rounded p-4 text-center max-w-sm mx-auto shadow-[0_0_15px_rgba(16,185,129,0.25)] select-none">
                  <div className="text-2xl mb-1">🔗</div>
                  <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest font-mono">
                    RESOLVED PATHWAY
                  </span>
                  <div className="text-slate-100 text-xs mt-3 flex items-center justify-center gap-1.5 font-mono uppercase font-bold">
                    <span>Domain</span>
                    <span>➔</span>
                    <span className="text-emerald-400">DNS</span>
                    <span>➔</span>
                    <span className="text-yellow-400">IP</span>
                    <span>➔</span>
                    <span className="text-green-400">Website</span>
                  </div>
                </div>

                {/* Lesson summary box */}
                <div className="bg-[#05010e] border border-[#23123a] p-4 rounded text-xs text-slate-300 font-mono space-y-2 select-all">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block tracking-wider mb-1.5">
                    Intel Database Dossier // Learnings
                  </span>
                  <div className="space-y-2 font-sans text-xs">
                    <div>• <strong>Website Name</strong> = **Domain** (human readable shortcut label).</div>
                    <div>• <strong>Numerical Address</strong> = **IP Address** (computer machine identifier).</div>
                    <div>• <strong>Translator</strong> = **DNS** (Domain Name System directories lookup table).</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    resetRoundStates();
                    setRound('INTRO');
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold text-xs py-3 rounded border border-[#23123a] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RETRY TRAINING
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    alert('TRAINING COMPLETE: Sentinel DNS address resolver metrics registered.');
                  }}
                  className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold text-xs py-3 rounded border-2 border-emerald-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-emerald-500/10 animate-pulse"
                >
                  FINALIZE TRAINING
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <footer className="relative z-10 py-1.5 border-t border-[#23123a] text-center font-mono text-[9px] text-slate-600 mt-4 select-none">
        PROJECT SENTINEL ASSESSMENT SUITE 2.0 // RESTRICTED ACCESS
      </footer>
    </div>
  );
}
