
import React from 'react';
import { PlayerClass } from '../types';

interface TaskReceiptProps {
  taskTitle: string;
  playerName: string;
  timeLeft: number;
  onContinue: () => void;
  onToggleChat: () => void;
  onSendToRadio?: (data: { taskTitle: string, receiptId: string, timeLeft: number }) => void;
}

const TaskReceipt: React.FC<TaskReceiptProps> = ({ taskTitle, playerName, timeLeft, onContinue, onToggleChat, onSendToRadio }) => {
  const timestamp = new Date().toLocaleTimeString();
  const date = new Date().toLocaleDateString();
  const receiptId = Math.random().toString(36).substring(2, 10).toUpperCase();

  const handleShare = async () => {
    const shareText = `[REGISTRO DE SOBREVIVÊNCIA]\nOperador: ${playerName}\nTarefa: ${taskTitle}\nStatus: CONCLUÍDA\nID: ${receiptId}\nTempo Restante: ${timeLeft}s\n#OutbreakSurvival`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Comprovante de Task - Outbreak',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Registro copiado para a área de transferência!");
    }
  };

  const handleRadioTransmission = () => {
    if (onSendToRadio) {
      onSendToRadio({ taskTitle, receiptId, timeLeft });
      alert("Registro transmitido para o canal de rádio!");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-sm mb-4 bg-zinc-100 p-8 rounded-sm shadow-[0_0_50px_rgba(255,255,255,0.1)] relative text-zinc-900 font-mono overflow-hidden max-w-sm">
        {/* Paper Texture Effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
        
        {/* Perforation Effect */}
        <div className="absolute -top-3 left-0 right-0 h-6 flex justify-around">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-black/90"></div>
          ))}
        </div>

        <div className="border-2 border-zinc-900 p-4 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="text-[10px] font-black uppercase leading-tight">
              PROTOCOLO DE SEGURANÇA<br/>SISTEMA_OUTBREAK v3.1
            </div>
            <div className="text-2xl">👤</div>
          </div>

          <div className="text-center mb-6 space-y-1">
            <div className="bg-zinc-900 text-white text-[10px] py-1 px-3 inline-block font-bold tracking-widest uppercase mb-2">
              COMPROVANTE DE EXECUÇÃO
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{taskTitle}</h2>
          </div>

          <div className="space-y-3 text-[11px] font-bold border-t border-b border-zinc-300 py-4 mb-4 uppercase">
            <div className="flex justify-between">
              <span>OPERADOR:</span>
              <span className="text-right truncate max-w-[150px]">{playerName}</span>
            </div>
            <div className="flex justify-between">
              <span>ESTADO:</span>
              <span className="text-emerald-700">✓ SUCESSO</span>
            </div>
            <div className="flex justify-between">
              <span>TEMPO_RESTANTE:</span>
              <span>{timeLeft}s</span>
            </div>
            <div className="flex justify-between">
              <span>ID_REGISTRO:</span>
              <span>#{receiptId}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-full h-8 bg-zinc-900 flex items-center justify-around px-2">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[2px] bg-zinc-100" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
              ))}
            </div>
            <span className="text-[8px] tracking-[0.4em] opacity-40 font-black">AUTENTICADO_PELO_SISTEMA</span>
          </div>

          <div className="text-[9px] text-zinc-500 italic text-center mb-6">
            Emitido em {date} às {timestamp}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
             <button
              onClick={handleRadioTransmission}
              className="py-3 bg-red-700 hover:bg-red-800 text-white text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <span>📻</span> TRANSMITIR
            </button>
            <button
              onClick={onToggleChat}
              className="py-3 bg-zinc-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span> VER RÁDIO
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-[11px] font-black uppercase tracking-widest transition-colors border border-zinc-400"
            >
              CÓPIA EXT.
            </button>
            <button
              onClick={onContinue}
              className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
            >
              PRÓXIMO
            </button>
          </div>
        </div>

        {/* Bottom Perforation */}
        <div className="absolute -bottom-3 left-0 right-0 h-6 flex justify-around">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-black/90"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskReceipt;
