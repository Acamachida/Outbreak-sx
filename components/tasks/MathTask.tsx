
import React, { useState } from 'react';

interface MathTaskProps {
  data: { equation: string; answer: number };
  onComplete: () => void;
}

const MathTask: React.FC<MathTaskProps> = ({ data, onComplete }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(value) === data.answer) {
      onComplete();
    } else {
      setValue('');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-10 w-full">
      <div className="bg-zinc-950 p-10 rounded border border-zinc-800 shadow-2xl w-full text-center">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.5em] mb-4">EQUAÇÃO DE FLUXO</p>
        <p className="text-5xl font-bold tracking-widest text-emerald-400 font-mono italic">{data.equation}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          autoFocus
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-black border-2 border-emerald-500/30 text-emerald-400 p-6 rounded-sm w-full text-center text-4xl font-mono focus:border-emerald-400 focus:outline-none shadow-inner"
          placeholder="???"
        />
        <button 
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-sm font-header text-3xl tracking-widest transition-all active:scale-95 shadow-lg"
        >
          CONFIRMAR CÁLCULO
        </button>
      </form>
    </div>
  );
};

export default MathTask;
