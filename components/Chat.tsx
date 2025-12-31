
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, PlayerClass } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isOpen, onClose, playerName }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-black/95 border-l-2 border-red-900/30 z-[150] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 bg-red-900/10 border-b border-red-900/30 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase">Canal de Comunicação</span>
          <span className="text-xl font-header text-white tracking-widest uppercase italic">Rádio de Fuga #09</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2">
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-red-900/50"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'SYSTEM' ? 'items-center text-center' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-black tracking-widest uppercase ${msg.isZombie ? 'text-emerald-500' : msg.sender === 'VELHO REED' ? 'text-red-500' : 'text-zinc-500'}`}>
                {msg.sender}
              </span>
              <span className="text-[8px] text-zinc-700">{msg.timestamp}</span>
            </div>

            {msg.type === 'RECEIPT' ? (
              <div className={`p-3 rounded-sm w-full border-l-4 text-black font-mono text-[10px] space-y-1 shadow-lg transform rotate-1 ${msg.isZombie ? 'bg-emerald-100 border-emerald-600' : 'bg-zinc-100 border-emerald-600'}`}>
                <div className="font-black border-b border-zinc-300 pb-1 mb-1">{msg.isZombie ? "☣️ ALERTA BIOLÓGICO" : "REGISTRO DE EXECUÇÃO"}</div>
                <div>TAREFA: <span className="font-bold">{msg.metadata?.taskTitle}</span></div>
                <div>OPERADOR: {msg.sender}</div>
                <div>ID: {msg.metadata?.receiptId}</div>
                <div className={`${msg.isZombie ? 'text-emerald-800' : 'text-emerald-700'} font-black mt-2`}>✓ STATUS: {msg.isZombie ? "REIVINDICADO" : "CONCLUÍDO"}</div>
              </div>
            ) : (
              <div className={`p-3 rounded-sm max-w-[90%] text-sm ${
                msg.sender === 'VELHO REED' 
                  ? 'bg-red-900/20 text-red-100 border border-red-900/40 italic' 
                  : msg.isZombie
                    ? 'bg-emerald-900/20 text-emerald-100 border border-emerald-900/40'
                    : 'bg-zinc-900/80 text-zinc-300 border border-zinc-800'
              }`}>
                {msg.text}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4 text-center">
             <div className="w-12 h-12 border-2 border-zinc-500 rounded-full animate-pulse flex items-center justify-center text-2xl">📻</div>
             <span className="text-[10px] font-bold tracking-[0.5em] uppercase">Sem sinal de rádio no momento...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-zinc-950 border-t border-zinc-900">
        <div className="flex flex-col gap-2">
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Identidade: {playerName}</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-black border border-zinc-800 p-3 text-zinc-200 text-sm font-mono focus:border-red-700 focus:outline-none placeholder:text-zinc-800"
            />
            <button 
              type="submit"
              className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 font-header text-xl tracking-widest transition-all"
            >
              ENVIAR
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Chat;
