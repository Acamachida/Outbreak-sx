
import React, { useMemo } from 'react';
import { SquadMember } from '../types';

interface TrackerMapProps {
  members: SquadMember[];
  myId: string;
  timeLeft: number;
  range?: number;
  isPrimordial?: boolean;
  isMapeador?: boolean;
  onClose: () => void;
}

const TrackerMap: React.FC<TrackerMapProps> = ({ members, myId, timeLeft, range = 50, isPrimordial = false, isMapeador = false, onClose }) => {
  const myMember = members.find(m => m.id === myId);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const visibleMembers = useMemo(() => {
    if (!myMember?.coords) return [];
    return members.map(m => {
      if (!m.coords) return { ...m, distance: Infinity, isVisible: false };
      const dist = calculateDistance(
        myMember.coords.lat, myMember.coords.lng,
        m.coords.lat, m.coords.lng
      );
      return { ...m, distance: dist, isVisible: dist <= range };
    });
  }, [members, myMember, range]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-500 font-mono">
      <div className={`w-full max-w-2xl flex justify-between items-end mb-8 border-b ${isMapeador ? 'border-blue-500/30' : isPrimordial ? 'border-emerald-500/30' : 'border-emerald-900/30'} pb-4`}>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 ${isMapeador ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full animate-ping`}></span>
            <span className={`${isMapeador ? 'text-blue-500' : 'text-yellow-500'} font-black text-[10px] tracking-[0.5em] uppercase`}>
              {isMapeador ? `RADAR DE MAPEAMENTO TÁTICO` : `SINCRO-RADAR DA HORDA`}
            </span>
          </div>
          <h2 className="text-4xl font-header text-white italic tracking-widest uppercase">SCANNER_V5 ({range}M)</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-red-500 font-mono text-[10px] mb-1 font-bold italic">ATIVO</span>
          <span className="text-4xl font-mono font-black text-red-500 leading-none">
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className={`relative w-full max-w-[500px] aspect-square bg-zinc-950 border-4 ${isMapeador ? 'border-blue-500/20' : 'border-emerald-900/20'} rounded-full overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.1)]`}>
        {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
          <div 
            key={scale}
            className={`absolute inset-0 border ${isMapeador ? 'border-blue-500/10' : 'border-emerald-900/10'} rounded-full pointer-events-none`}
            style={{ transform: `scale(${scale})` }}
          />
        ))}
        
        <div className={`absolute top-1/2 left-0 w-full h-[1px] ${isMapeador ? 'bg-blue-500/10' : 'bg-emerald-900/10'}`}></div>
        <div className={`absolute left-1/2 top-0 w-[1px] h-full ${isMapeador ? 'bg-blue-500/10' : 'bg-emerald-900/10'}`}></div>
        <div className={`absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/5 ${isMapeador ? 'to-blue-500/10' : 'to-emerald-500/10'} origin-center animate-[spin_6s_linear_infinite]`}></div>

        {visibleMembers.map((m) => {
          if (!m.isVisible || !m.coords || !myMember?.coords) return null;

          const latDiff = (m.coords.lat - myMember.coords.lat) * 111320;
          const lngDiff = (m.coords.lng - myMember.coords.lng) * (111320 * Math.cos(myMember.coords.lat * Math.PI / 180));

          const x = 50 + (lngDiff / range) * 50;
          const y = 50 - (latDiff / range) * 50;

          let dotColor = 'bg-blue-500 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]';
          let labelColor = 'bg-blue-900 text-blue-200 border-blue-500';

          if (m.isDead) {
             dotColor = 'bg-green-600 border-green-400 shadow-[0_0_15px_rgba(22,163,74,0.8)]';
             labelColor = 'bg-green-900 text-green-200 border-green-500';
          } else if (m.isZombie) {
             dotColor = 'bg-orange-600 border-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.8)]';
             labelColor = 'bg-orange-900 text-orange-200 border-orange-500';
          }

          if (m.id === myId) {
             dotColor = 'bg-white border-zinc-400 shadow-[0_0_15px_white]';
             labelColor = 'bg-white text-black border-zinc-400';
          }

          return (
            <div 
              key={m.id}
              className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500 flex items-center justify-center z-20 ${dotColor}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
               <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded border shadow-lg ${labelColor}`}>
                    {m.name}
                  </span>
                  <span className="text-[8px] text-zinc-300 font-mono mt-1 bg-black/80 px-1">{Math.round(m.distance)}m</span>
               </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex gap-4 w-full max-w-2xl">
          <div className="flex-1 bg-blue-900/20 border border-blue-900/40 p-4 rounded-sm flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="text-blue-500 text-[10px] font-black uppercase">SOBREVIVENTES</div>
          </div>
          <div className="flex-1 bg-green-900/20 border border-green-900/40 p-4 rounded-sm flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="text-green-500 text-[10px] font-black uppercase">ZUMBIS</div>
          </div>
          <div className="flex-1 bg-orange-900/20 border border-orange-900/40 p-4 rounded-sm flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div className="text-orange-500 text-[10px] font-black uppercase">INFECTADOS</div>
          </div>
      </div>

      <button onClick={onClose} className="mt-8 py-6 px-16 bg-zinc-900 border-2 border-zinc-700 text-white font-header text-3xl tracking-widest italic hover:bg-zinc-800 transition-all uppercase rounded-sm">
        VOLTAR PARA AS TASKS
      </button>
    </div>
  );
};

export default TrackerMap;
