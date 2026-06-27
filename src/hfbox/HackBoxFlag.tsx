import React, { useState } from 'react';
import { KeyRound, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import './hackbox.css';

interface HackBoxFlagProps {
  userId: string;
  roomId: number;
  disabled: boolean;
  orchestratorUrl: string;
}

const HackBoxFlag: React.FC<HackBoxFlagProps> = ({ userId, roomId, disabled, orchestratorUrl }) => {
  const [flag, setFlag] = useState('');
  const [flagStatus, setFlagStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const verifyFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag) return;
    
    try {
      const res = await fetch(`${orchestratorUrl}/flag/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId, flag })
      });
      const data = await res.json();
      if (data.correct) {
        setFlagStatus('success');
      } else {
        setFlagStatus('error');
      }
    } catch (err) {
      console.error(err);
      // MOCK FALLBACK for dev without backend
      if (flag === "hf{example}") {
        setFlagStatus('success');
      } else {
        setFlagStatus('error');
      }
    }
    
    setTimeout(() => setFlagStatus('idle'), 4000);
  };

  return (
    <div className="hb-panel p-6 hb-animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <h2 className="text-sm font-bold uppercase text-[#a258ff] mb-4 flex items-center gap-2 tracking-widest">
        <KeyRound size={16} /> 
        Flag Submission
      </h2>
      <form onSubmit={verifyFlag} className="flex flex-col gap-3">
        <input 
          type="text" 
          placeholder="hf{...}" 
          className="hb-input"
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          disabled={disabled}
        />
        <button 
          type="submit" 
          className="hb-btn hb-btn-outline w-full"
          disabled={disabled}
        >
          Submit Flag <ChevronRight size={16} />
        </button>
      </form>
      
      {/* Flag Status Feedback */}
      {flagStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/50 rounded flex items-center gap-2 text-green-400 text-sm hb-animate-slide-up">
          <CheckCircle2 size={16} /> Correct Flag. +XP Awarded.
        </div>
      )}
      {flagStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded flex items-center gap-2 text-red-400 text-sm hb-animate-slide-up">
          <XCircle size={16} /> Incorrect Flag.
        </div>
      )}
    </div>
  );
};

export default HackBoxFlag;
