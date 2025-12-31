
import React, { useState } from 'react';

interface InfectadoTaskProps {
  onComplete: () => void;
}

const BODY_PARTS = ['BRAÇO', 'PESCOÇO', 'PERNAS'];

const InfectadoTask: React.FC<InfectadoTaskProps> = ({ onComplete }) => {
  const [targetPart, setTargetPart] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const sortear = () => {
    setIsSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      setTargetPart(BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)]);
      count++;
      if (count > 20) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 80);
  };

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-md p-8 bg-zinc-950 border-2 border-emerald-900/30 rounded-sm shadow-[0_0_50px_rgba(16,185,129,0.1)]">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 bg-emerald-900/20 border border-emerald-500/50 text-emerald-500 text-[10px] font-black tracking-[0.5em] uppercase animate-pulse">
          PROTOCOLO DE NECROSE
        </div>
        <p className="text-zinc-400 text-sm font-mono leading-relaxed italic">
          "A infecção deve ser visível. Sorteie uma região e use maquiagem para marcar o avanço da praga no seu corpo real."
        </p>
      </div>

      <div className={`w-full py-12 bg-black border-2 transition-all flex items-center justify-center font-header text-5xl tracking-widest italic ${isSpinning ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-zinc-800 text-zinc-100'}`}>
        {targetPart || 'PRONTO?'}
      </div>

      <div className="grid grid-cols-1 gap-4 w-full">
        <button
          onClick={sortear}
          disabled={isSpinning}
          className="py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-header text-3xl tracking-widest border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
        >
          SORTEAR PARTE
        </button>

        <button
          disabled={!targetPart || isSpinning}
          onClick={onComplete}
          className={`py-5 font-header text-3xl tracking-widest transition-all active:scale-95 ${targetPart && !isSpinning ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
        >
          TAREFA CONCLUÍDA
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
         <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.4em] text-center">
          SISTEMA DE ENGANO ATIVO
        </span>
        <div className="w-full h-1 bg-zinc-900 overflow-hidden">
           <div className="h-full bg-emerald-900/50 animate-[progress_10s_linear_infinite]"></div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default InfectadoTask;
