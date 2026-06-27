import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Clock, Play, Square, AlertTriangle, XCircle } from 'lucide-react';
import './hackbox.css';
import HackBoxFlag from './HackBoxFlag';

const API_BASE = import.meta.env.VITE_API_URL || "http://168.144.144.36";
const ORCHESTRATOR_URL = import.meta.env.VITE_API_URL || "http://168.144.144.36";

type SessionState = 'idle' | 'starting' | 'running' | 'expired' | 'error';

interface HackBoxTerminalProps {
  userId: string;
  roomId: number;
}

const HackBoxTerminal: React.FC<HackBoxTerminalProps> = ({ userId, roomId }) => {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [novncUrl, setNovncUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for active session on mount
  useEffect(() => {
    checkSessionStatus();
    return () => stopTimer();
  }, [userId]);

  useEffect(() => {
    if (sessionState === 'running' && remainingTime > 0) {
      startTimer();
    } else if (remainingTime <= 0 && sessionState === 'running') {
      setSessionState('expired');
      stopTimer();
    }
    return () => stopTimer();
  }, [sessionState, remainingTime]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setRemainingTime(prev => Math.max(0, prev - 1));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkSessionStatus = async () => {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/session/status/${userId}`);
      if (!res.ok) throw new Error("Status API failed");
      const data = await res.json();
      if (data.active) {
        setSessionState('running');
        setRemainingTime(data.remainingSeconds || (45 * 60)); 
        setNovncUrl(`${API_BASE}/novnc/${data.port}/vnc.html?autoconnect=true&resize=scale&reconnect=true`);
      } else {
        if (sessionState === 'running') {
            setSessionState('expired');
            setNovncUrl('');
            stopTimer();
        }
      }
    } catch (err) {
      console.warn("Could not fetch session status, assuming idle.", err);
    }
  };

  const startHackBox = async () => {
    setSessionState('starting');
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start session");
      }
      
      const data = await res.json();
      
      setNovncUrl(`${API_BASE}/novnc/${data.port}/vnc.html?autoconnect=true&resize=scale&reconnect=true`);
      setRemainingTime(data.expiresIn || data.remainingSeconds || (45 * 60));
      setSessionState('running');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Unable to start HackBox. Please try again.");
      setSessionState('error');
    }
  };

  const terminateHackBox = async () => {
    try {
      await fetch(`${ORCHESTRATOR_URL}/session/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSessionState('idle');
      setRemainingTime(0);
      setNovncUrl('');
      stopTimer();
    }
  };

  const addTime = async () => {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/session/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, minutes: 20 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.remainingMinutes) {
          setRemainingTime(data.remainingMinutes * 60);
        } else if (data.remainingSeconds) {
          setRemainingTime(data.remainingSeconds);
        } else {
          setRemainingTime(prev => prev + 20 * 60);
        }
      } else {
        throw new Error("Failed to extend");
      }
    } catch (err) {
      console.error(err);
      // Optional fallback
    }
  };

  const isLowTime = remainingTime <= 300 && remainingTime > 0; // <= 5 minutes

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full text-slate-100 font-sans">
      
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        
        {/* Status Panel */}
        <div className="hb-panel p-6 hb-animate-slide-up">
          <h2 className="text-sm font-bold uppercase text-[#a258ff] mb-4 flex items-center gap-2 tracking-widest">
            <ActivityIcon active={sessionState === 'running'} /> 
            Session Control
          </h2>
          
          {sessionState === 'idle' && (
            <div className="flex flex-col gap-4 text-center py-4">
              <p className="text-sm text-slate-400 mb-2">Initialize your independent lab container.</p>
              <button className="hb-btn hb-btn-primary w-full" onClick={startHackBox}>
                <Play size={18} /> Start HackBox
              </button>
            </div>
          )}

          {sessionState === 'starting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-8 h-8 border-4 border-[#a258ff] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-[#a258ff] hb-animate-pulse-glow">Provisioning Container...</p>
            </div>
          )}

          {sessionState === 'running' && (
            <div className="flex flex-col gap-6">
              <div className="text-center bg-[#05010e] border border-[#23123a] rounded-lg p-4 relative overflow-hidden">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Remaining Time</p>
                <div className={`text-4xl font-mono font-bold ${isLowTime ? 'text-[#ff3b3b] animate-pulse' : 'text-white'}`}>
                  {formatTime(remainingTime)}
                </div>
                {isLowTime && (
                  <p className="text-xs text-[#ff3b3b] mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> Your HackBox expires in {Math.ceil(remainingTime/60)} minutes
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button className="hb-btn hb-btn-outline w-full" onClick={addTime}>
                  <Clock size={16} /> +20 Minutes
                </button>
                <button className="hb-btn hb-btn-danger w-full" onClick={terminateHackBox}>
                  <Square size={16} /> Terminate HackBox
                </button>
              </div>
            </div>
          )}

          {sessionState === 'expired' && (
            <div className="flex flex-col gap-4 text-center py-4">
              <div className="flex justify-center mb-2 text-[#ff3b3b]">
                <XCircle size={32} />
              </div>
              <p className="font-bold text-[#ff3b3b]">Session Expired</p>
              <p className="text-xs text-slate-400 mb-2">Start a new session to continue.</p>
              <button className="hb-btn hb-btn-primary w-full" onClick={startHackBox}>
                <Play size={18} /> Start New Session
              </button>
            </div>
          )}
          
          {sessionState === 'error' && (
            <div className="flex flex-col gap-4 text-center py-4">
              <p className="font-bold text-[#ff3b3b]">{errorMsg}</p>
              <button className="hb-btn hb-btn-outline w-full" onClick={() => setSessionState('idle')}>
                Please try again
              </button>
            </div>
          )}
        </div>

        {/* Flag Submission */}
        <HackBoxFlag 
          userId={userId} 
          roomId={roomId} 
          disabled={sessionState !== 'running'} 
          orchestratorUrl={ORCHESTRATOR_URL}
        />
        
      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-h-[600px] lg:min-h-0">
        <div className="hb-panel flex-1 flex flex-col p-1 hb-animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {sessionState === 'running' && novncUrl ? (
            <div className="hb-iframe-container">
              <iframe src={novncUrl} title="HackBox Terminal" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#000] rounded-lg border border-[#23123a] relative overflow-hidden">
              <Terminal size={48} className="text-[#23123a] mb-4" />
              <p className="text-slate-600 font-mono uppercase tracking-widest">Terminal Offline</p>
              <div className="hb-scanline-effect"></div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`absolute w-full h-full rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`}></div>
      {active && <div className="absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-75"></div>}
    </div>
  );
}

export default HackBoxTerminal;
