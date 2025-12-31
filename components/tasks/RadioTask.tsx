
import React, { useState, useEffect } from 'react';

interface RadioTaskProps {
  onComplete: () => void;
}

const RadioTask: React.FC<RadioTaskProps> = ({ onComplete }) => {
  const [targetFreq] = useState(() => (Math.random() * (108.0 - 88.0) + 88.0).toFixed(1));
  const [currentFreq, setCurrentFreq] = useState(98.0);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const targetNum = parseFloat(targetFreq);
  const diff = Math.abs(currentFreq - targetNum);
  const signalStrength = Math.max(0, 100 - diff * 20);

  useEffect(() => {
    if (diff < 0.05 && !isCalibrated) {
      setIsCalibrated(true);
      setTimeout(onComplete, 800);
    }
  }, [currentFreq, targetNum, diff, isCalibrated, onComplete]);

  const adjustFreq = (amount: number) => {
    if (isCalibrated) return;
    setCurrentFreq(prev => {
      const next = prev + amount;
      return Math.min(Math.max(next, 88.0), 108.0);
    });
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md p-6 bg-zinc-950 rounded border border-zinc-800 shadow-2xl">
      {/* Display do Rádio */}
      <div className="w-full bg-black border-2 border-zinc-800 p-6 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/10 animate-pulse"></div>
        <div className="flex justify-between items-end mb-4">
          <span className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Frequência de Emergência</span>
          <span className="text-[10px] text-emerald-500/50 font-bold tracking-widest uppercase">Sinal: {Math.round(signalStrength)}%</span>
        </div>
        
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-6xl font-mono font-black text-emerald-500 tracking-tighter shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {currentFreq.toFixed(1)}
          </div>
          <div className="text-xl font-mono text-emerald-900 mt-4">MHz</div>
        </div>

        {/* Visualizador de Onda (Estético) */}
        <div className="h-12 w-full flex items-center justify-center gap-1 opacity-40">
          {[...Array(20)].map((_, i) => {
            const height = isCalibrated ? 20 : Math.random() * (100 - signalStrength) + 5;
            return (
              <div 
                key={i} 
                className={`w-1 transition-all duration-75 ${isCalibrated ? 'bg-emerald-400' : 'bg-emerald-900'}`}
                style={{ height: `${height}%` }}
              ></div>
            );
          })}
        </div>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-zinc-600 uppercase font-bold text-center">Ajuste Fino</span>
          <div className="flex gap-2">
            <button 
              onClick={() => adjustFreq(-0.1)}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold active:scale-95 transition-all"
            >
              -0.1
            </button>
            <button 
              onClick={() => adjustFreq(0.1)}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold active:scale-95 transition-all"
            >
              +0.1
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-zinc-600 uppercase font-bold text-center">Busca Rápida</span>
          <div className="flex gap-2">
            <button 
              onClick={() => adjustFreq(-1.0)}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold active:scale-95 transition-all"
            >
              -1.0
            </button>
            <button 
              onClick={() => adjustFreq(1.0)}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold active:scale-95 transition-all"
            >
              +1.0
            </button>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Frequência Alvo</p>
        <p className="text-2xl font-mono text-zinc-100 font-black tracking-widest">{targetFreq} MHz</p>
      </div>

      {isCalibrated && (
        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-emerald-600 text-white px-8 py-4 font-header text-3xl tracking-widest shadow-2xl rotate-2">
             SINAL ESTABILIZADO
           </div>
        </div>
      )}
    </div>
  );
};

export default RadioTask;
