
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import MemoryTask from './tasks/MemoryTask';
import TypingTask from './tasks/TypingTask';
import WireTask from './tasks/WireTask';
import LockPickTask from './tasks/LockPickTask';
import RadioTask from './tasks/RadioTask';
import InfectadoTask from './tasks/InfectadoTask';

interface TaskRendererProps {
  task: Task;
  playerClass?: string;
  onUnlock: () => void;
  onComplete: () => void;
}

const TaskRenderer: React.FC<TaskRendererProps> = ({ task, playerClass, onUnlock, onComplete }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isError, setIsError] = useState(false);

  // Infectados não precisam de código para suas tarefas secretas
  const isSecretTask = task.type === 'INFECTADO_SECRET';

  useEffect(() => {
    if (isSecretTask) {
      setIsUnlocked(true);
      onUnlock();
    } else {
      setIsUnlocked(false);
    }
    setCodeInput('');
    setIsError(false);
  }, [task.id, isSecretTask]);

  const handleKeypad = (val: string) => {
    if (isError) setIsError(false);
    if (codeInput.length < 3) {
      setCodeInput(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setCodeInput(prev => prev.slice(0, -1));
  };

  const handleAuth = () => {
    if (codeInput === task.code) {
      setIsUnlocked(true);
      onUnlock();
    } else {
      setIsError(true);
      setCodeInput('');
      setTimeout(() => setIsError(false), 500);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="w-full max-w-md mx-auto p-10 bg-zinc-950/90 border-2 border-zinc-800 rounded-sm shadow-2xl backdrop-blur-xl animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1 bg-red-900/20 border border-red-900/50 text-red-600 text-[10px] font-bold tracking-[0.4em] uppercase mb-4">
            CRIPTOGRAFADO // CHAVE NUMÉRICA NECESSÁRIA
          </div>
          <h2 className="text-4xl font-header text-white uppercase tracking-widest mb-2">CÓDIGO DE ACESSO</h2>
          <p className="text-zinc-500 font-mono text-xs italic">OBJETIVO: {task.title}</p>
        </div>

        <div className={`mb-8 p-6 bg-black border-2 rounded-sm text-center font-mono text-5xl tracking-[0.5em] transition-all h-24 flex items-center justify-center ${isError ? 'border-red-600 text-red-600 animate-shake' : 'border-zinc-800 text-zinc-100'}`}>
          {codeInput.padEnd(3, '_')}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => (
            <button
              key={k}
              onClick={() => {
                if (k === 'C') setCodeInput('');
                else if (k === 'DEL') handleBackspace();
                else handleKeypad(k);
              }}
              className="py-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-bold text-2xl active:scale-90 transition-all shadow-inner"
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={handleAuth}
          disabled={codeInput.length < 3}
          className={`w-full py-5 font-header text-3xl tracking-widest shadow-lg transition-all ${codeInput.length === 3 ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
        >
          AUTENTICAR_SISTEMA
        </button>

        <p className="mt-6 text-center text-[11px] text-zinc-800/40 font-bold tracking-[0.3em] uppercase">
          SISTEMA AGUARDANDO ENTRADA EXTERNA
        </p>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-12 bg-zinc-900/60 rounded-sm border border-red-900/10 shadow-2xl backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/20 animate-[scan_4s_linear_infinite]"></div>
      
      <div className="mb-10 text-center">
        <h2 className="text-[11px] font-bold tracking-[0.5em] text-red-700 uppercase mb-3">
          MISSÃO ATIVA // OPERAÇÃO EM CURSO
        </h2>
        <h3 className="text-5xl font-header text-zinc-100 italic uppercase tracking-wider">{task.title}</h3>
        {!isSecretTask && <p className="text-zinc-500 mt-4 font-mono text-sm max-w-md mx-auto leading-relaxed">{task.description}</p>}
      </div>

      <div className="min-h-[380px] flex items-center justify-center bg-black/60 rounded border border-zinc-800/30 p-8 shadow-inner">
        {task.type === 'MEMORY' && <MemoryTask data={task.data} onComplete={onComplete} />}
        {task.type === 'TYPING' && <TypingTask data={task.data} onComplete={onComplete} />}
        {task.type === 'WIRES' && <WireTask onComplete={onComplete} wireCount={task.data.wireCount} />}
        {task.type === 'LOCKPICK' && <LockPickTask onComplete={onComplete} targetPins={task.data.pins || 3} />}
        {task.type === 'RADIO' && <RadioTask onComplete={onComplete} />}
        {task.type === 'INFECTADO_SECRET' && <InfectadoTask onComplete={onComplete} />}
      </div>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TaskRenderer;
