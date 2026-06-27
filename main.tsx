import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ChevronRight } from 'lucide-react'
import './index4game.css'
import Modul1Game from './Modul1Game.tsx'
import Modul2Game from './Modul2Game.tsx'
import Modul3Game from './Modul3Game.tsx'
import Modul4Game from './Modul4Game.tsx'
import Modul5Game from './Modul5Game.tsx'
import Modul6Game from './Modul6Game.tsx'
import Modul7Game from './Modul7Game.tsx'
import Modul9Game from './Modul9Game.tsx'

const Hub = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-6 space-y-8 font-mono select-none mt-10">
      <div className="text-center space-y-2">
        <span className="text-[11px] text-[#a258ff] font-bold uppercase tracking-widest">PROJECT SENTINEL ACCESS PORTAL</span>
        <h1 className="text-slate-100 text-3xl font-extrabold uppercase tracking-tight text-glow-purple">
          RECRUIT ASSESSMENT SUITE
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-sans">
          You must clear all training modules to establish full clearance. Select an assessment node to establish a terminal handshake.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full animate-none">
        {/* Node 1 */}
        <div 
          onClick={() => onNavigate('/module1')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 01 // SENTINEL CORE</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">THE RECRUIT TEST</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Rapid statement evaluation framework testing fact vs myth cybersecurity fundamentals.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 2 */}
        <div 
          onClick={() => onNavigate('/module2')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 02 // FIREWALL BUFFER</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">COMMAND CATCH</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Arcade catching module. Align the bucket with incoming shell command inputs matching objectives.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 3 */}
        <div 
          onClick={() => onNavigate('/module3')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 03 // VIRTUAL TERMINAL</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">TERMINAL CRAWL</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Console crawling shell. Navigate standard UNIX directory pathways and decrypt intelligence.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 4 */}
        <div 
          onClick={() => onNavigate('/module4')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 04 // SUSPECT INSPECT</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">FIND FAKE AGENT</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Terminal investigation crawler. Inspect file slices using head, tail, cat, and less to find the mole.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 5 */}
        <div 
          onClick={() => onNavigate('/module5')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 05 // SYSTEM BREACH</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">WHO STOLE THE KEY?</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              UNIX access permissions detective assessment. Audit security logs and identify the unauthorized thief.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 6 */}
        <div 
          onClick={() => onNavigate('/module6')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 06 // NETWORK STACK</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">NETWORK OPERATOR</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Act as the network operator to drag packets and deliver the Sentinel portal to the user terminal.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>

        {/* Node 7 */}
        <div 
          onClick={() => onNavigate('/module7')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 07 // DIGITAL ADDRESSES</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">DELIVERY SERVICE</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Deliver intelligence to correct website destinations by translating domains into numerical IP addresses.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>



        {/* Node 9 */}
        <div 
          onClick={() => onNavigate('/module9')}
          className="border border-[#23123a] bg-[#0d061a] hover:border-[#a258ff] p-5 rounded-md flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-[0_0_15px_var(--color-neon-purple-glow)] transition-all group animate-none"
        >
          <div className="space-y-1">
            <span className="text-[9px] text-[#a258ff] font-bold uppercase block tracking-wider">NODE 09 // OBSIDIAN PACKET</span>
            <h3 className="text-slate-200 font-extrabold text-sm uppercase group-hover:text-white">PACKET FACTORY</h3>
            <p className="text-slate-500 font-sans text-xs leading-relaxed">
              Understand data transit. Sort packets into TCP/UDP pipes and stamp them with the correct OSI layers.
            </p>
          </div>
          <span className="text-[10px] text-[#a258ff] font-bold uppercase tracking-widest flex items-center gap-1">
            ACCESS NODE <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform animate-pulse" />
          </span>
        </div>
      </div>
      
      <div className="text-[9px] text-slate-600 font-mono tracking-widest border-t border-[#23123a] pt-4 w-full text-center">
        PROJECT SENTINEL EVALUATION DEPLOYMENT SUITE 2026 // RESTRICTED ACCESS
      </div>
    </div>
  );
};

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Clean trailing slashes for routing checks
  const cleanPath = currentPath.replace(/\/$/, '') || '/';

  return (
    <div className="min-h-screen bg-[#05010e] text-slate-100 flex flex-col">
      {/* Dynamic Global Top Portal Navbar */}
      <nav className="w-full bg-[#0d061a] border-b border-[#23123a] px-4 py-3 flex justify-between items-center font-mono text-xs select-none z-40 shrink-0">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigateTo('/')}>
          <span className="text-[#a258ff] font-bold hover:text-[#b070ff] transition-colors">PROJECT SENTINEL</span>
          <span className="text-slate-500 font-semibold">// EVALUATION GATE</span>
        </div>
        <div className="flex gap-4">
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module1' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module1')}
          >
            MODULE 1
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module2' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module2')}
          >
            MODULE 2
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module3' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module3')}
          >
            MODULE 3
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module4' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module4')}
          >
            MODULE 4
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module5' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module5')}
          >
            MODULE 5
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module6' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module6')}
          >
            MODULE 6
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module7' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module7')}
          >
            MODULE 7
          </span>
          <span 
            className={`cursor-pointer hover:text-[#a258ff] transition-colors ${cleanPath === '/module9' ? 'text-[#a258ff] font-bold underline underline-offset-4' : 'text-slate-400'}`} 
            onClick={() => navigateTo('/module9')}
          >
            MODULE 9
          </span>
        </div>
      </nav>

      {/* Main router switch */}
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        {cleanPath === '/module1' && <Modul1Game />}
        {cleanPath === '/module2' && <Modul2Game />}
        {cleanPath === '/module3' && <Modul3Game />}
        {cleanPath === '/module4' && <Modul4Game />}
        {cleanPath === '/module5' && <Modul5Game />}
        {cleanPath === '/module6' && <Modul6Game />}
        {cleanPath === '/module7' && <Modul7Game />}
        {cleanPath === '/module9' && <Modul9Game />}
        {cleanPath !== '/module1' && cleanPath !== '/module2' && cleanPath !== '/module3' && cleanPath !== '/module4' && cleanPath !== '/module5' && cleanPath !== '/module6' && cleanPath !== '/module7' && cleanPath !== '/module9' && (
          <Hub onNavigate={navigateTo} />
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
