
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface MemoryTaskProps {
  data: { sequence: number[] };
  onComplete: () => void;
}

const MemoryTask: React.FC<MemoryTaskProps> = ({ data, onComplete }) => {
  const [userInput, setUserInput] = useState<number[]>([]);
  const [showSequence, setShowSequence] = useState(true);
  const [highlightedNum, setHighlightedNum] = useState<number | null>(null);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);

  const playSequence = useCallback(async () => {
    setShowSequence(true);
    setUserInput([]);
    for (const num of data.sequence) {
      setHighlightedNum(num);
      await new Promise(r => setTimeout(r, 500)); 
      setHighlightedNum(null);
      await new Promise(r => setTimeout(r, 200)); 
    }
    setShowSequence(false);
  }, [data.sequence]);

  useEffect(() => {
    playSequence();
  }, [playSequence]);

  const handleClick = (num: number) => {
    if (showSequence || isError) return;
    
    // Feedback visual rápido de clique
    setLastClicked(num);
    setTimeout(() => setLastClicked(null), 150);

    const nextIndex = userInput.length;
    if (num === data.sequence[nextIndex]) {
      const newInput = [...userInput, num];
      setUserInput(newInput);
      
      if (newInput.length === data.sequence.length) {
        onComplete();
      }
    } else {
      setIsError(true);
      setUserInput([]);
      setTimeout(() => {
        setIsError(false);
        playSequence();
      }, 1000);
    }
  };

  const buttons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div className="flex flex-col items-center space-y-8 w-full">
      <div className="text-center">
        <p className={`text-xs font-bold tracking-[0.4em] uppercase mb-2 ${isError ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
          {isError ? 'ERRO DE SINCRONIA' : showSequence ? 'MEMORIZANDO PADRÃO TÉRMICO...' : 'RETIRE A TRAVA MAGNÉTICA'}
        </p>
        <div className="flex justify-center gap-1 mb-4">
          {data.sequence.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 w-4 rounded-full transition-all duration-300 ${
                i < userInput.length ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-zinc-950 p-6 rounded border border-zinc-800 shadow-2xl relative">
        {/* Camada de erro visual */}
        {isError && <div className="absolute inset-0 bg-red-900/20 animate-pulse z-0 rounded"></div>}
        
        {buttons.map((num) => {
          const isHighlighted = highlightedNum === num;
          const isPressed = lastClicked === num;
          
          return (
            <button
              key={num}
              onClick={() => handleClick(num)}
              className={`w-16 h-16 md:w-20 md:h-20 rounded-sm font-black text-3xl transition-all border-2 flex items-center justify-center relative z-10 ${
                num === 0 ? 'col-start-2' : ''
              } ${
                isHighlighted ? 'bg-red-600 border-red-400 text-white scale-105 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 
                isPressed ? 'bg-emerald-600 border-emerald-400 text-white scale-95 shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                isError ? 'border-red-900/50 text-red-900 opacity-50 cursor-not-allowed' :
                'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-500 hover:text-zinc-300 active:scale-95'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] text-zinc-700 font-mono tracking-widest uppercase font-black">Nível de Acesso: {data.sequence.length} caminhos</span>
        <div className="h-1.5 w-48 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div 
            className="h-full bg-emerald-600 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${(userInput.length / data.sequence.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default MemoryTask;
