import React from 'react';
import { Terminal } from 'lucide-react';
import HackBoxTerminal from './hfbox/HackBoxTerminal';

const MOCK_USER_ID = "user123";
const MOCK_ROOM_ID = 8; // Module 8 Room

const Modul8Game: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col p-6 space-y-6 animate-none font-sans">
      <div className="space-y-2 border-b border-[#23123a] pb-6">
        <span className="text-[11px] text-[#a258ff] font-bold uppercase tracking-widest block">
          NODE 08 // PRACTICAL LAB
        </span>
        <h1 className="text-slate-100 text-3xl font-extrabold uppercase tracking-tight text-glow-purple flex items-center gap-3">
          <Terminal className="text-[#a258ff] w-8 h-8" /> 
          KALI LINUX HACKBOX
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Initialize your independent Kali Linux environment to complete the practical assessment flags. Your container is fully isolated and will automatically self-destruct after the timer expires.
        </p>
      </div>

      <div className="flex-1 w-full bg-[#05010e] rounded-lg relative min-h-[700px]">
        <HackBoxTerminal userId={MOCK_USER_ID} roomId={MOCK_ROOM_ID} />
      </div>
    </div>
  );
};

export default Modul8Game;
