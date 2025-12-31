
import React, { useState, useEffect } from 'react';

interface WireTaskProps {
  onComplete: () => void;
  wireCount?: number;
}

const ALL_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#10b981', '#f97316', '#06b6d4'];

const WireTask: React.FC<WireTaskProps> = ({ onComplete, wireCount = 5 }) => {
  const [colors] = useState(() => ALL_COLORS.slice(0, wireCount));
  const [leftOrder] = useState(() => [...colors].sort(() => Math.random() - 0.5));
  const [rightOrder] = useState(() => [...colors].sort(() => Math.random() - 0.5));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});

  const handleLeftClick = (color: string) => {
    if (connections[color]) return;
    setSelectedLeft(color);
  };

  const handleRightClick = (color: string) => {
    if (selectedLeft && selectedLeft === color) {
      const newConnections = { ...connections, [color]: color };
      setConnections(newConnections);
      setSelectedLeft(null);
      
      if (Object.keys(newConnections).length === colors.length) {
        setTimeout(onComplete, 500);
      }
    } else {
      setSelectedLeft(null);
    }
  };

  return (
    <div className="flex justify-between items-center w-full max-w-md bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-inner">
      <div className="flex flex-col gap-5">
        {leftOrder.map((color) => (
          <button
            key={color}
            onClick={() => handleLeftClick(color)}
            className={`w-14 h-6 rounded-sm transition-all shadow-lg ${
              connections[color] ? 'opacity-30 grayscale' : 
              selectedLeft === color ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[9px] text-zinc-700 font-mono mb-2 uppercase tracking-widest">Barramento de Dados</div>
        <div className="h-48 w-[1px] bg-zinc-900 relative">
          {Object.keys(connections).map((color, idx) => (
            <div key={idx} className="absolute inset-0 animate-pulse" style={{ backgroundColor: color, opacity: 0.2 }}></div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {rightOrder.map((color) => (
          <button
            key={color}
            onClick={() => handleRightClick(color)}
            className={`w-14 h-6 rounded-sm transition-all shadow-lg ${
              Object.values(connections).includes(color) ? 'opacity-30 grayscale' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
};

export default WireTask;
