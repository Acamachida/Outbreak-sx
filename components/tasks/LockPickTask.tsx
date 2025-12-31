
import React, { useState, useEffect, useRef } from 'react';

interface LockPickTaskProps {
  onComplete: () => void;
  targetPins?: number;
}

const LockPickTask: React.FC<LockPickTaskProps> = ({ onComplete, targetPins = 3 }) => {
  const [pinsSet, setPinsSet] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [direction, setDirection] = useState(1);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);
  
  // Velocidade reduzida para ser mais justo
  const speed = 1.0 + pinsSet * 0.4; 
  // Zona de acerto aumentada para 10 (total de 20% da barra)
  const HIT_THRESHOLD = 10;
  
  const [targetZone, setTargetZone] = useState(() => Math.random() * 60 + 20);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSliderPos((prev) => {
        let next = prev + direction * speed;
        if (next >= 100) {
          setDirection(-1);
          return 100;
        }
        if (next <= 0) {
          setDirection(1);
          return 0;
        }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [direction, speed]);

  const handleAction = () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    
    const isHit = Math.abs(sliderPos - targetZone) < HIT_THRESHOLD;
    
    if (isHit) {
      setFeedback('hit');
      if (pinsSet + 1 >= targetPins) {
        setPinsSet(targetPins);
        setTimeout(onComplete, 400);
      } else {
        setPinsSet(pinsSet + 1);
        setTargetZone(Math.random() * 60 + 20);
      }
    } else {
      setFeedback('miss');
      // No erro, voltamos apenas 1 pino em vez de resetar tudo para ser menos frustrante
      setPinsSet(prev => Math.max(0, prev - 1));
    }

    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 200);
  };

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-md">
      <div className="flex gap-3">
        {[...Array(targetPins)].map((_, i) => (
          <div
            key={i}
            className={`w-10 h-20 border-2 rounded-t-sm transition-all duration-300 ${
              i < pinsSet 
                ? 'bg-zinc-100 border-zinc-100 -translate-y-8 shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className={`w-full h-1 mt-4 ${i < pinsSet ? 'bg-emerald-500' : 'bg-red-900/40'}`}></div>
            <div className="flex justify-center mt-3">
              <div className={`w-1 h-10 ${i < pinsSet ? 'bg-zinc-400' : 'bg-zinc-800'}`}></div>
            </div>
          </div>
        ))}
      </div>

      <div className={`w-full h-20 rounded-sm relative overflow-hidden border-2 transition-colors duration-150 shadow-inner ${
        feedback === 'hit' ? 'border-emerald-500 bg-emerald-950/30' : 
        feedback === 'miss' ? 'border-red-700 bg-red-950/30' : 
        'border-zinc-800 bg-black/40'
      }`}>
        <div 
          className="absolute h-full bg-red-600/20 border-x border-red-500/40 transition-all duration-300"
          style={{ 
            left: `${targetZone - HIT_THRESHOLD}%`, 
            width: `${HIT_THRESHOLD * 2}%` 
          }}
        ></div>
        
        <div 
          className="absolute h-full w-2 bg-white shadow-[0_0_20px_white] z-10"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        ></div>
      </div>

      <button
        onMouseDown={handleAction}
        className={`w-full py-6 font-header text-4xl tracking-widest transition-all active:scale-[0.97] uppercase rounded-sm ${
          feedback === 'hit' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
          feedback === 'miss' ? 'bg-red-800 text-white shadow-[0_0_20px_rgba(153,27,27,0.3)]' :
          'bg-zinc-100 hover:bg-white text-black'
        }`}
      >
        FORÇAR PINO
      </button>
      
      <div className="text-center space-y-2">
        <p className="text-xs text-zinc-500 font-bold tracking-[0.3em] uppercase">
          {pinsSet === targetPins ? 'TRAVA LIBERADA' : `MECANISMO: ${pinsSet}/${targetPins} PINOS`}
        </p>
      </div>
    </div>
  );
};

export default LockPickTask;
