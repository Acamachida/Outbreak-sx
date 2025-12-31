
import React, { useState } from 'react';

interface TypingTaskProps {
  data: { phrase: string };
  onComplete: () => void;
}

const TypingTask: React.FC<TypingTaskProps> = ({ data, onComplete }) => {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    if (val === data.phrase) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 max-w-md w-full">
      <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 w-full">
        <p className="text-xl font-mono text-zinc-300 select-none break-all">
          {data.phrase.split('').map((char, i) => {
            let color = 'text-zinc-500';
            if (i < value.length) {
              color = value[i] === char ? 'text-emerald-400' : 'text-red-500';
            }
            return <span key={i} className={color}>{char}</span>;
          })}
        </p>
      </div>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={handleChange}
        className="w-full bg-zinc-900 border-2 border-emerald-500/20 p-4 rounded text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
        placeholder="Digite exatamente como acima..."
      />
    </div>
  );
};

export default TypingTask;
