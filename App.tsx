
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameState, Task, GameStats, PlayerClass, ChatMessage, SquadMember, TaskType } from './types';
import TaskRenderer from './components/TaskRenderer';
import TaskReceipt from './components/TaskReceipt';
import Chat from './components/Chat';
import TrackerMap from './components/TrackerMap';
import { getEvaluation } from './services/geminiService';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseConfig = {
  url: "https://epjoelbqledptvocfoet.supabase.co",
  anonKey: "sb_publishable_odUkLrVam-XU6dkZiBRTdw_1WROuMDv"
};

const hasSupabase = supabaseConfig.url !== "" && supabaseConfig.url.includes('supabase.co');
const supabase = hasSupabase ? createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;

const GAME_TIME_LIMIT = 90; 
const TOTAL_TASKS_PER_PLAYER = 4;
const PROXIMITY_ACTION_RANGE = 15;
const CRITICAL_PROXIMITY_RANGE = 10; 
const MAPPER_RADAR_RANGE = 50; 
const PRIMORDIAL_RADAR_RANGE = 25; 
const RADAR_COOLDOWN_MS = 300000; // 5 minutos
const RADAR_DURATION_S = 70; // 70 segundos

const CLASS_DATA: Record<PlayerClass, any> = {
  'MEDICO': { name: 'MÉDICO', auth: '#724#890', tasks: [
    { title: 'CURAR FERIMENTOS', code: '189', type: 'LOCKPICK', desc: 'Realize suturas de alta precisão.', data: { pins: 5 } },
    { title: 'PRODUZIR KITS', code: '123', type: 'MEMORY', desc: 'Memorize a combinação química.', data: { sequence: [1, 2, 3, 6, 5, 4, 7, 8, 9] } },
    { title: 'TRATAR INFECTADOS', code: '167', type: 'MEMORY', desc: 'Descontaminação viral.', data: { sequence: [1, 6, 7, 3, 9, 2, 4, 8, 5] } },
    { title: 'POSTO MÉDICO', code: '193', type: 'TYPING', desc: 'Sincronize o banco de dados.', data: { phrase: 'AUTORIZAR_SISTEMA_MEDICO_RECARGA_MOLECULAR_NIVEL_X9' } }
  ]},
  'CIENTISTA': { name: 'CIENTISTA', auth: '#655#918', tasks: [
    { title: 'PESQUISAR ORIGEM', code: '501', type: 'MEMORY', desc: 'Mapeie o DNA do Vírus-Z.', data: { sequence: [5, 0, 1, 8, 4, 7, 3, 2, 9] } },
    { title: 'DESENVOLVER VACINA', code: '534', type: 'WIRES', desc: 'Estabilize conexões de antígenos.', data: { wireCount: 7 } },
    { title: 'ANALISAR AMOSTRAS', code: '567', type: 'RADIO', desc: 'Filtre interferências.', data: {} },
    { title: 'CRIAR TECNOLOGIA', code: '589', type: 'LOCKPICK', desc: 'Destrave o núcleo de energia.', data: { pins: 6 } }
  ]},
  'EXECUTOR': { name: 'EXECUTOR', auth: '#900#312', tasks: [
    { title: 'ELIMINAR ZUMBIS', code: '601', type: 'LOCKPICK', desc: 'Libere a trava de segurança.', data: { pins: 6 } },
    { title: 'PROTEGER BASES', code: '628', type: 'WIRES', desc: 'Arme cercas eletrificadas.', data: { wireCount: 7 } },
    { title: 'MISSÃO DE RISCO', code: '654', type: 'TYPING', desc: 'Autentique bombardeio.', data: { phrase: 'CONFIRMAR_ALVO_BOMBARDEIO_ORBITAL_AREA_CONTAMINADA_7' } },
    { title: 'ESCOLTA ARMADA', code: '689', type: 'WIRES', desc: 'Religue o sistema de rádio.', data: { wireCount: 6 } }
  ]},
  'MAPEADOR': { name: 'MAPEADOR', auth: '#477#260', tasks: [
    { title: 'EXPLORAR ÁREAS', code: '701', type: 'RADIO', desc: 'Rastreie sinal de satélite.', data: {} },
    { title: 'ATUALIZAR MAPAS', code: '724', type: 'MEMORY', desc: 'Grave coordenadas de perigo.', data: { sequence: [7, 2, 4, 0, 5, 8, 1, 9, 3] } },
    { title: 'MARCAR RECURSOS', code: '758', type: 'LOCKPICK', desc: 'Destranque cofre militar.', data: { pins: 5 } },
    { title: 'GUIAR GRUPOS', code: '789', type: 'TYPING', desc: 'Transmita rota de fuga.', data: { phrase: 'RECONFIGURAR_SATELITE_GPS_ROTA_FUGA_SETOR_DELTA_X' } }
  ]},
  'ZUMBI_PRIMORDIAL': { name: 'ZUMBI PRIMORDIAL', auth: '#666#131', tasks: [
    { title: 'PACIENTE ZERO', code: '---', type: 'INFECTADO_SECRET', desc: 'Inicie a dispersão do patógeno.', data: {} },
    { title: 'SABOTAGEM BIO', code: '423', type: 'WIRES', desc: 'Destrua circuitos de emergência.', data: { wireCount: 7 } },
    { title: 'GRITO DA HORDA', code: '446', type: 'MEMORY', desc: 'Grito ensurdecedor.', data: { sequence: [4, 4, 6, 4, 4, 6, 1, 1, 9] } },
    { title: 'INFECTAR TUDO', code: '478', type: 'LOCKPICK', desc: 'Abra jaulas biológicas.', data: { pins: 6 } }
  ]},
  'INFECTADO': { name: 'INFECTADO', auth: '#812#541', tasks: [
    { title: 'NECROSE', code: '---', type: 'INFECTADO_SECRET', desc: 'O vírus avança.', data: {} },
    { title: 'SABOTAGEM', code: '423', type: 'WIRES', desc: 'Corte a fiação.', data: { wireCount: 7 } },
    { title: 'RASTRO', code: '446', type: 'MEMORY', desc: 'Siga o som do coração.', data: { sequence: [4, 4, 6, 1, 2, 9, 8, 7] } },
    { title: 'INVASÃO', code: '478', type: 'LOCKPICK', desc: 'Arrombe portas blindadas.', data: { pins: 5 } }
  ]},
  'DEFAULT': { name: 'SOBREVIVENTE', auth: '', tasks: [
    { title: 'PROCURAR SUPRIMENTOS', code: '201', type: 'LOCKPICK', desc: 'Tente abrir o armário.', data: { pins: 4 } },
    { title: 'REFORÇAR ABRIGO', code: '214', type: 'WIRES', desc: 'Religue o gerador.', data: { wireCount: 6 } },
    { title: 'EXPLORAR RECURSOS', code: '237', type: 'MEMORY', desc: 'Busque itens.', data: { sequence: [2, 3, 7, 5, 8, 0, 1, 4] } },
    { title: 'AJUDAR OUTROS', code: '259', type: 'TYPING', desc: 'Transmita o código de socorro.', data: { phrase: 'S.O.S_PRECISAMOS_DE_EXTRACAO_IMEDIATA_PONTO_7' } }
  ]}
};

const MY_ID = sessionStorage.getItem('OUTBREAK_PLAYER_ID') || Math.random().toString(36).substring(2, 15);
sessionStorage.setItem('OUTBREAK_PLAYER_ID', MY_ID);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [playerName, setPlayerName] = useState('');
  const [playerClass, setPlayerClass] = useState<PlayerClass>('DEFAULT');
  const [isZombie, setIsZombie] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joiningCode, setJoiningCode] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [realSquad, setRealSquad] = useState<SquadMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evaluation, setEvaluation] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showMeetingAlert, setShowMeetingAlert] = useState(false);
  const [showInfectMenu, setShowInfectMenu] = useState(false);
  const [showHealMenu, setShowHealMenu] = useState(false);
  const [showKillMenu, setShowKillMenu] = useState(false);
  
  // Radar Mapeador States
  const [showRadar, setShowRadar] = useState(false);
  const [radarTimer, setRadarTimer] = useState(0);
  const [lastRadarUseTime, setLastRadarUseTime] = useState(0);
  
  const [myCoords, setMyCoords] = useState<{lat: number, lng: number} | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [taskResetTrigger, setTaskResetTrigger] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const nearbyPlayers = useMemo(() => {
    if (!myCoords) return [];
    return realSquad
      .filter(m => m.id !== MY_ID && m.coords)
      .map(m => ({ ...m, dist: calculateDistance(myCoords.lat, myCoords.lng, m.coords!.lat, m.coords!.lng) }))
      .filter(m => m.dist <= CRITICAL_PROXIMITY_RANGE)
      .sort((a, b) => a.dist - b.dist);
  }, [realSquad, myCoords]);

  const globalProgress = useMemo(() => {
    const survivors = realSquad.filter(m => !m.isZombie && !m.isDead);
    if (survivors.length === 0) return 0;
    const totalPossibleTasks = survivors.length * TOTAL_TASKS_PER_PLAYER;
    const totalCompletedTasks = survivors.reduce((acc, m) => acc + m.tasksCompleted, 0);
    return Math.min(Math.round((totalCompletedTasks / totalPossibleTasks) * 100), 100);
  }, [realSquad]);

  const syncLocalPresence = useCallback((updates: Partial<SquadMember>) => {
    setRealSquad(prev => {
      const exists = prev.find(m => m.id === MY_ID);
      if (exists) return prev.map(m => m.id === MY_ID ? { ...m, ...updates } : m);
      return [...prev, { id: MY_ID, name: playerName, pClass: playerClass, isReady: false, isHost: true, isZombie: isZombie || playerClass === 'INFECTADO' || playerClass === 'ZUMBI_PRIMORDIAL', isDead: isDead, tasksCompleted: currentTaskIndex, ...updates } as SquadMember];
    });
    if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'presence_sync', payload: { id: MY_ID, ...updates } });
    }
  }, [playerName, playerClass, isDead, isZombie, currentTaskIndex]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyCoords(coords);
        syncLocalPresence({ coords });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [syncLocalPresence]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (isZombie || isDead) return;
    const newMessage: ChatMessage = { 
      ...msg, 
      id: Math.random().toString(36).substring(7), 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, newMessage]);
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: newMessage });
    }
  }, [isZombie, isDead]);

  const handleSendToRadio = useCallback((data: { taskTitle: string, receiptId: string, timeLeft: number }) => {
    if (isZombie || isDead) return;
    const receiptMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: playerName,
      text: `Tarefa Concluída: ${data.taskTitle}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'RECEIPT',
      metadata: data
    };
    setMessages(prev => [...prev, receiptMsg]);
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: receiptMsg });
    }
  }, [playerName, isZombie, isDead]);

  const endGame = useCallback(async (success: boolean, reason: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerActive(false);
    setGameState(success ? GameState.FINISHED : GameState.FAILED);
    setEvaluation(reason);
  }, []);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const survivors = realSquad.filter(m => !m.isZombie && !m.isDead);
    if (survivors.length === 0 && realSquad.length > 0) {
      endGame(false, "FIM DA LINHA. A HORDA DOMINOU O SETOR.");
      return;
    }
    const allHumansFinished = survivors.length > 0 && survivors.every(s => s.tasksCompleted === 4);
    if (allHumansFinished) {
      endGame(true, "MISSÃO CUMPRIDA! EXTRAÇÃO AUTORIZADA.");
    }
  }, [realSquad, gameState, endGame]);

  const startGameLocal = () => {
    const isInf = playerClass === 'INFECTADO' || playerClass === 'ZUMBI_PRIMORDIAL';
    setIsZombie(isInf);
    setIsDead(false);
    const initialTasks: Task[] = CLASS_DATA[playerClass].tasks.map((t: any, i: number) => ({
      id: i + 1, type: t.type, title: t.title, description: t.desc, code: t.code, data: t.data, validator: () => true
    }));
    setTasks(initialTasks);
    setCurrentTaskIndex(0);
    setTimeLeft(GAME_TIME_LIMIT);
    setIsTimerActive(false); 
    setGameState(GameState.PLAYING);
    syncLocalPresence({ tasksCompleted: 0, isZombie: isInf, isDead: false });
  };

  const handleGoBack = () => {
    setGameState(GameState.IDLE);
    setRoomCode('');
    setRealSquad([]);
    setMessages([]);
  };

  // Main Timer Effect
  useEffect(() => {
    if (gameState === GameState.PLAYING && isTimerActive && !showReceipt && !showMeetingAlert && !showRadar) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => { 
          if (prev <= 1) { 
            setIsTimerActive(false);
            setTaskResetTrigger(t => t + 1);
            return GAME_TIME_LIMIT; 
          } 
          return prev - 1; 
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, isTimerActive, showReceipt, showMeetingAlert, showRadar]);

  // Radar Timer Effect
  useEffect(() => {
    if (showRadar) {
      radarIntervalRef.current = setInterval(() => {
        setRadarTimer(prev => {
          if (prev <= 1) {
            setShowRadar(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (radarIntervalRef.current) {
      clearInterval(radarIntervalRef.current);
    }
    return () => { if (radarIntervalRef.current) clearInterval(radarIntervalRef.current); };
  }, [showRadar]);

  useEffect(() => {
    if (!supabase || !roomCode) return;
    const channel = supabase.channel(`room_${roomCode}`);
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      if (!isZombie && !isDead) setMessages(prev => [...prev, payload]);
    });
    channel.on('broadcast', { event: 'presence_sync' }, ({ payload }) => {
        setRealSquad(prev => {
          const exists = prev.find(m => m.id === payload.id);
          if (exists) return prev.map(m => m.id === payload.id ? { ...m, ...payload } : m);
          return [...prev, payload];
        });
    });
    channel.on('broadcast', { event: 'infection_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsZombie(true);
            setIsDead(true);
            setIsChatOpen(false);
            setTasks([]);
            syncLocalPresence({ isZombie: true, isDead: true, tasksCompleted: 0 });
            setActionFeedback("SINAL VITAL PERDIDO: VOCÊ FOI INFECTADO!");
            setTimeout(() => setActionFeedback(null), 5000);
        }
    });
    channel.on('broadcast', { event: 'heal_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsZombie(false);
            setIsDead(false);
            setPlayerClass('DEFAULT');
            setTasks(CLASS_DATA['DEFAULT'].tasks.map((t: any, i: number) => ({
              id: i + 1, type: t.type, title: t.title, description: t.desc, code: t.code, data: t.data, validator: () => true
            })));
            syncLocalPresence({ isZombie: false, isDead: false, pClass: 'DEFAULT' });
            setActionFeedback("ANTÍGENO APLICADO! VOCÊ ESTÁ CURADO.");
            setTimeout(() => setActionFeedback(null), 5000);
        }
    });
    channel.on('broadcast', { event: 'kill_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsDead(true);
            setIsZombie(true);
            setIsChatOpen(false);
            setTasks([]);
            syncLocalPresence({ isDead: true, isZombie: true, tasksCompleted: 0 });
            setActionFeedback("ALVO ELIMINADO PELO EXECUTOR.");
            setTimeout(() => setActionFeedback(null), 5000);
        }
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [roomCode, isZombie, isDead, syncLocalPresence]);

  const handleTacticalAction = (event: string, targetId: string) => {
    const target = realSquad.find(m => m.id === targetId);
    if (!target?.coords || !myCoords) { alert("GPS OFF-LINE"); return; }
    const dist = calculateDistance(myCoords.lat, myCoords.lng, target.coords.lat, target.coords.lng);
    if (dist > PROXIMITY_ACTION_RANGE) {
      setActionFeedback(`ALVO MUITO DISTANTE (${Math.round(dist)}m)`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event, payload: { targetId } });
      setActionFeedback("AÇÃO CONFIRMADA.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleStartRadar = () => {
    if (currentTaskIndex < 1) {
      alert("RADAR BLOQUEADO: FINALIZE A PRIMEIRA TASK.");
      return;
    }
    const now = Date.now();
    if (now - lastRadarUseTime < RADAR_COOLDOWN_MS) {
      const remaining = Math.ceil((RADAR_COOLDOWN_MS - (now - lastRadarUseTime)) / 1000);
      alert(`RADAR EM RECARGA: AGUARDE ${remaining}s`);
      return;
    }
    setRadarTimer(RADAR_DURATION_S);
    setLastRadarUseTime(now);
    setShowRadar(true);
  };

  const radarCooldownProgress = Math.min(100, ((Date.now() - lastRadarUseTime) / RADAR_COOLDOWN_MS) * 100);

  return (
    <div className={`min-h-screen bg-black text-white flex flex-col items-center relative overflow-hidden ${nearbyPlayers.length > 0 ? 'animate-proximity-pulse' : ''}`}>
      <header className="w-full p-6 flex justify-between items-start z-10 max-w-2xl">
        <div className="flex items-start gap-4">
           <div className={`w-12 h-12 flex items-center justify-center rounded-sm ${(isDead || isZombie) ? 'bg-emerald-800' : 'bg-[#b91c1c]'}`}>
              <span className="text-2xl">{(isDead || isZombie) ? '☣️' : '💀'}</span>
           </div>
           <div className="flex flex-col">
              <h1 className="text-4xl font-header tracking-tight leading-none">OUTBREAK_OS</h1>
              <span className={`text-[10px] font-mono tracking-[0.3em] uppercase ${(isDead || isZombie) ? 'text-emerald-500 font-bold' : 'text-[#b91c1c]'}`}>
                {isDead ? 'SISTEMA COMPROMETIDO' : isZombie ? 'INFECTADO ATIVO' : 'PROTOCOLO DE DEFESA'}
              </span>
           </div>
        </div>
        
        {!isZombie && !isDead && (
          <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 rounded-sm text-[10px] font-mono tracking-widest text-zinc-400 hover:text-white transition-all">
            <span className="text-sm">📻</span> RÁDIO
          </button>
        )}
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center px-6 z-10">
        {gameState === GameState.IDLE && (
          <div className="w-full max-md text-center flex flex-col items-center">
            <div className="mb-12">
              <span className="text-[10px] font-mono tracking-[0.3em] text-[#b91c1c] uppercase block mb-1">PROTOCOLO DE REDE ATIVO</span>
              <h1 className="text-8xl font-header neon-text-red italic leading-none mb-6">OUTBREAK</h1>
            </div>
            <div className="w-full space-y-4 mb-8">
              <button onClick={() => { setRoomCode(Math.floor(1000+Math.random()*9000).toString()); setGameState(GameState.SELECT_CLASS); }} className="w-full py-10 btn-red text-white flex flex-col items-center justify-center rounded-sm">
                <span className="text-3xl font-header tracking-widest italic">CRIAR SALA</span>
              </button>
              <button onClick={() => setGameState(GameState.JOIN_ROOM)} className="w-full py-10 btn-outline text-white flex flex-col items-center justify-center rounded-sm">
                <span className="text-3xl font-header tracking-widest italic">ENTRAR EM SALA</span>
              </button>
            </div>
          </div>
        )}

        {(gameState === GameState.SELECT_CLASS || gameState === GameState.JOIN_ROOM) && (
          <div className="w-full max-sm space-y-8 animate-in fade-in duration-300">
             <div className="text-center">
                <h2 className="text-4xl font-header italic tracking-widest mb-2 uppercase">Identificação</h2>
                <div className="h-0.5 bg-[#b91c1c] w-12 mx-auto"></div>
             </div>
             <div className="space-y-6">
                <div className="bg-[#050505] border border-[#1a1a1a] p-4">
                   <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">NOME_DO_OPERADOR</label>
                   <input type="text" maxLength={12} value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} placeholder="NICKNAME" className="w-full bg-transparent text-2xl font-mono text-white outline-none placeholder:opacity-10" />
                </div>
                {gameState === GameState.JOIN_ROOM ? (
                   <div className="bg-[#050505] border border-[#1a1a1a] p-4 text-center">
                      <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">FREQ_CANAL</label>
                      <div className="text-4xl font-mono tracking-[0.2em] text-[#b91c1c] h-12 flex items-center justify-center">{joiningCode.padEnd(4, '_')}</div>
                   </div>
                ) : (
                   <div className="bg-[#050505] border border-[#1a1a1a] p-4 text-center">
                      <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">CHAVE_DE_CLASSE</label>
                      <div className="text-4xl font-mono tracking-[0.2em] text-[#b91c1c] h-12 flex items-center justify-center">{authCode.padEnd(8, '_')}</div>
                   </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9, gameState === GameState.SELECT_CLASS ? '#' : 'C', 0, 'DEL'].map(k => (
                     <button key={k} onClick={() => {
                        if (k === 'DEL') (gameState === GameState.SELECT_CLASS ? setAuthCode(prev => prev.slice(0, -1)) : setJoiningCode(prev => prev.slice(0, -1)));
                        else if (k === 'C') setJoiningCode('');
                        else if (k === '#') { if (gameState === GameState.SELECT_CLASS && authCode.length < 8) setAuthCode(prev => prev + k); }
                        else {
                          if (gameState === GameState.SELECT_CLASS) { if (authCode.length < 8) setAuthCode(prev => prev + k); } 
                          else { if (joiningCode.length < 4) setJoiningCode(prev => prev + k); }
                        }
                     }} className="py-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-xl font-bold transition-all">{k}</button>
                   ))}
                </div>
                <div className="space-y-3">
                  <button onClick={() => {
                        if (gameState === GameState.JOIN_ROOM) { setRoomCode(joiningCode); setGameState(GameState.SELECT_CLASS); }
                        else {
                          const found = Object.keys(CLASS_DATA).find(k => CLASS_DATA[k as PlayerClass].auth === authCode) as PlayerClass;
                          if (found) { setPlayerClass(found); setGameState(GameState.LOBBY); syncLocalPresence({ name: playerName, pClass: found }); }
                          else { alert("CHAVE INVÁLIDA"); setAuthCode(''); }
                        }
                    }} className="w-full py-6 btn-red text-white text-2xl font-header tracking-widest italic disabled:opacity-20 rounded-sm" disabled={gameState === GameState.JOIN_ROOM ? joiningCode.length < 4 : (authCode.length < 8 || !playerName)}>
                    CONFIRMAR
                  </button>
                  <button onClick={() => { 
                    if (!playerName) { alert("DÊ UM NOME AO SEU OPERADOR"); return; }
                    setPlayerClass('DEFAULT'); 
                    if (gameState === GameState.JOIN_ROOM) setRoomCode(joiningCode);
                    setGameState(GameState.LOBBY); 
                    syncLocalPresence({ name: playerName, pClass: 'DEFAULT' }); 
                  }} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">SEM CLASSE</button>
                  <button onClick={handleGoBack} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">VOLTAR</button>
                </div>
             </div>
          </div>
        )}

        {gameState === GameState.LOBBY && (
          <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-end border-b border-[#1f1f1f] pb-4">
                <h2 className="text-4xl font-header italic uppercase tracking-widest">SQUAD_SYNC #{roomCode}</h2>
             </div>
             <div className="space-y-2 max-h-64 overflow-y-auto">
                {realSquad.map(m => (
                  <div key={m.id} className="p-4 bg-[#050505] border border-[#1a1a1a] flex justify-between items-center rounded-sm">
                    <span className="text-xl font-header uppercase italic tracking-widest">{m.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">{CLASS_DATA[m.pClass].name}</span>
                  </div>
                ))}
             </div>
             <div className="space-y-3">
                <button onClick={startGameLocal} className="w-full py-8 btn-red text-white text-4xl font-header tracking-widest italic rounded-sm">INICIAR MISSÃO</button>
                <button onClick={() => setGameState(GameState.SELECT_CLASS)} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">VOLTAR PARA CLASSES</button>
             </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="w-full max-w-xl space-y-6 relative">
             <div className="w-full bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-bold">PROGRESSO_SETOR_GLOBAL</span>
                   <span className="text-2xl font-header text-emerald-500 tracking-widest italic">{globalProgress}%</span>
                </div>
                <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-[2px]">
                   <div className="h-full bg-emerald-600 transition-all duration-1000 rounded-full" style={{ width: `${globalProgress}%` }} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2">
                {isZombie && (
                  <button onClick={() => setShowInfectMenu(true)} className="py-4 bg-emerald-900/50 border border-emerald-500 text-white font-header text-xl tracking-widest italic rounded-sm">☣️ INFECTAR</button>
                )}
                {playerClass === 'MEDICO' && !isZombie && (
                  <button onClick={() => setShowHealMenu(true)} className="py-4 bg-blue-900/50 border border-blue-500 text-white font-header text-xl tracking-widest italic rounded-sm">💉 CURAR</button>
                )}
                {playerClass === 'EXECUTOR' && !isZombie && (
                  <button onClick={() => setShowKillMenu(true)} className="py-4 bg-red-900/50 border border-red-500 text-white font-header text-xl tracking-widest italic rounded-sm">🔫 ELIMINAR</button>
                )}
                {(playerClass === 'MAPEADOR' || playerClass === 'ZUMBI_PRIMORDIAL') && (
                  <button 
                    onClick={handleStartRadar} 
                    className={`py-4 bg-zinc-900 border border-white text-white font-header text-xl tracking-widest italic rounded-sm relative overflow-hidden ${currentTaskIndex < 1 || radarCooldownProgress < 100 ? 'opacity-40 grayscale' : ''}`}
                  >
                    <span className="relative z-10">📡 LOCALIZAR</span>
                    <div className="absolute bottom-0 left-0 h-1 bg-white transition-all duration-300" style={{ width: `${radarCooldownProgress}%` }} />
                  </button>
                )}
             </div>

             {(showInfectMenu || showHealMenu || showKillMenu) && (
               <div className="fixed inset-0 z-[160] bg-black/95 flex flex-col items-center justify-center p-6 border-2 border-[#b91c1c] animate-in fade-in">
                  <h2 className="text-3xl font-header italic text-white mb-8 uppercase tracking-widest">
                    {showInfectMenu ? 'Transmissão Viral' : showHealMenu ? 'Protocolo Médico' : 'Neutralizar Alvo'}
                  </h2>
                  <div className="w-full space-y-3 max-h-64 overflow-y-auto mb-8 px-4">
                     {realSquad.filter(m => {
                        if (showInfectMenu) return m.id !== MY_ID && !m.isZombie;
                        if (showHealMenu) return m.id !== MY_ID && m.isZombie;
                        if (showKillMenu) return m.id !== MY_ID && m.isZombie;
                        return false;
                     }).map(member => (
                       <button key={member.id} onClick={() => { 
                         const event = showInfectMenu ? 'infection_attempt' : showHealMenu ? 'heal_attempt' : 'kill_attempt';
                         handleTacticalAction(event, member.id);
                         setShowInfectMenu(false); setShowHealMenu(false); setShowKillMenu(false);
                       }} className="w-full p-4 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xl font-header italic tracking-widest uppercase flex justify-between">
                         <span>{member.name}</span>
                         <span className="text-xs font-mono">{member.coords ? `${Math.round(calculateDistance(myCoords?.lat||0, myCoords?.lng||0, member.coords.lat, member.coords.lng))}m` : '---'}</span>
                       </button>
                     ))}
                  </div>
                  <button onClick={() => { setShowInfectMenu(false); setShowHealMenu(false); setShowKillMenu(false); }} className="py-3 px-8 btn-outline text-white font-header text-xl uppercase tracking-widest italic rounded-sm">CANCELAR</button>
               </div>
             )}

             {showRadar && (
               <TrackerMap 
                 members={realSquad} 
                 myId={MY_ID} 
                 timeLeft={radarTimer} 
                 range={playerClass === 'MAPEADOR' ? MAPPER_RADAR_RANGE : PRIMORDIAL_RADAR_RANGE} 
                 isMapeador={playerClass === 'MAPEADOR'}
                 isPrimordial={playerClass === 'ZUMBI_PRIMORDIAL'}
                 onClose={() => setShowRadar(false)} 
               />
             )}

             {showMeetingAlert && (
               <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md">
                 <div className="w-full max-md bg-zinc-950 border-4 border-[#b91c1c] p-8 text-center shadow-[0_0_100px_rgba(185,28,28,0.2)]">
                   <h2 className="text-5xl font-header italic text-white mb-6 leading-none">REUNIÃO DE EMERGÊNCIA</h2>
                   <p className="text-xl font-mono text-zinc-200 mb-8 leading-relaxed uppercase">REÚNAM-SE NO PONTO INICIAL.<br/><span className="text-2xl font-bold text-[#b91c1c]">DECISÃO EM GRUPO.</span></p>
                   <button onClick={() => { setShowMeetingAlert(false); if (!isDead) setShowReceipt(true); }} className="w-full py-6 bg-[#b91c1c] hover:bg-[#dc2626] text-white font-header text-3xl tracking-widest italic transition-all">PROSSEGUIR</button>
                 </div>
               </div>
             )}

             {actionFeedback && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[90%] p-8 bg-zinc-950 border-4 border-emerald-600 shadow-2xl text-center animate-in zoom-in">
                  <h3 className="text-3xl font-header italic text-white uppercase tracking-tighter leading-tight">{actionFeedback}</h3>
               </div>
             )}

             <div className={`flex items-center justify-between p-6 bg-[#050505] border border-[#1a1a1a] border-l-4 rounded-sm ${isZombie ? 'border-l-emerald-500' : 'border-l-[#b91c1c]'}`}>
                <div>
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">CRONÔMETRO</span>
                   <span className={`text-6xl font-mono font-black italic tracking-tighter leading-none ${timeLeft < 25 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                      {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
                   </span>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">PROGRESSO</span>
                   <span className={`text-3xl font-header italic uppercase tracking-widest leading-none ${isZombie ? 'text-emerald-400' : 'text-[#b91c1c]'}`}>
                     {isZombie ? 'INFECTADO' : `TASK ${currentTaskIndex+1}/4`}
                   </span>
                </div>
             </div>

             <div className="bg-[#050505] border border-[#1a1a1a] p-1 min-h-[400px] flex items-center justify-center relative rounded-sm">
                {isDead ? (
                  <div className="text-center p-10 bg-zinc-950 border-2 border-emerald-900 animate-in zoom-in duration-500">
                    <div className="text-7xl mb-4">☣️</div>
                    <h2 className="text-4xl font-header italic text-emerald-500 uppercase tracking-widest mb-4">INFECTADO ATIVO</h2>
                    <p className="text-xl font-mono text-zinc-300 uppercase leading-relaxed text-emerald-300">VOCÊ É PARTE DA HORDA AGORA.<br/><span className="text-2xl font-black">ESPALHE O VÍRUS PELO SETOR.</span></p>
                  </div>
                ) : showReceipt ? (
                  <TaskReceipt 
                    taskTitle={tasks[currentTaskIndex]?.title || "MISSÃO"} 
                    playerName={playerName} 
                    timeLeft={timeLeft} 
                    onContinue={() => {
                      setShowReceipt(false);
                      setIsTimerActive(false); 
                      setTimeLeft(GAME_TIME_LIMIT); 
                      const nextCount = currentTaskIndex + 1;
                      setCurrentTaskIndex(nextCount);
                      syncLocalPresence({ tasksCompleted: nextCount });
                    }} 
                    onToggleChat={()=>setIsChatOpen(true)}
                    onSendToRadio={handleSendToRadio}
                  />
                ) : (
                  <TaskRenderer 
                    key={currentTaskIndex + '-' + taskResetTrigger} 
                    task={tasks[currentTaskIndex]} 
                    onUnlock={() => setIsTimerActive(true)} 
                    onComplete={() => setShowMeetingAlert(true)} 
                  />
                )}
             </div>
          </div>
        )}

        {(gameState === GameState.FINISHED || gameState === GameState.FAILED) && (
          <div className="w-full max-md text-center space-y-8 py-10">
             <div className={`p-1 w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${gameState === GameState.FINISHED ? 'border-emerald-500' : 'border-red-600'}`}>
                <span className="text-5xl">{gameState === GameState.FINISHED ? '🏆' : '☣️'}</span>
             </div>
             <h2 className={`text-6xl font-header italic leading-tight uppercase ${gameState === GameState.FINISHED ? 'text-emerald-500' : 'text-[#b91c1c]'}`}>
                {gameState === GameState.FINISHED ? 'VITÓRIA DO ESQUADRÃO' : 'EXTINÇÃO TOTAL'}
             </h2>
             <div className="p-8 bg-[#050505] border border-[#1a1a1a] relative rounded-sm">
                <p className="text-2xl italic text-white/90 font-mono leading-relaxed font-bold">"{evaluation}"</p>
             </div>
             <button onClick={handleGoBack} className="w-full py-6 btn-outline text-white font-header text-3xl uppercase tracking-widest italic hover:bg-[#b91c1c] transition-all rounded-sm">VOLTAR AO MENU</button>
          </div>
        )}
      </main>
      
      <Chat 
        messages={messages} 
        onSendMessage={(text) => addMessage({ sender: playerName, text, type: 'TEXT' })} 
        isOpen={isChatOpen && !isZombie && !isDead} 
        onClose={() => setIsChatOpen(false)} 
        playerName={playerName} 
      />
      
      <style>{`
        @keyframes proximity-pulse {
          0% { box-shadow: inset 0 0 50px rgba(245, 158, 11, 0); }
          50% { box-shadow: inset 0 0 80px rgba(245, 158, 11, 0.15); }
          100% { box-shadow: inset 0 0 50px rgba(245, 158, 11, 0); }
        }
        .animate-proximity-pulse {
          animation: proximity-pulse 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
