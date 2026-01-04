
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
const RADAR_COOLDOWN_MS = 300000; 
const RADAR_DURATION_S = 70; 

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
  const [isHost, setIsHost] = useState(false);
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
  const [showRadar, setShowRadar] = useState(false);
  const [radarTimer, setRadarTimer] = useState(0);
  const [lastRadarUseTime, setLastRadarUseTime] = useState(0);
  const [myCoords, setMyCoords] = useState<{lat: number, lng: number} | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [taskResetTrigger, setTaskResetTrigger] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerNameRef = useRef(playerName);
  const playerClassRef = useRef(playerClass);
  const isZombieRef = useRef(isZombie);
  const isDeadRef = useRef(isDead);
  const currentTaskIndexRef = useRef(currentTaskIndex);
  const gameStateRef = useRef(gameState);
  const isHostRef = useRef(isHost);

  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { playerClassRef.current = playerClass; }, [playerClass]);
  useEffect(() => { isZombieRef.current = isZombie; }, [isZombie]);
  useEffect(() => { isDeadRef.current = isDead; }, [isDead]);
  useEffect(() => { currentTaskIndexRef.current = currentTaskIndex; }, [currentTaskIndex]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

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

  const syncLocalPresence = useCallback((updates: Partial<SquadMember> = {}) => {
    if (!channelRef.current) return;

    const myData: SquadMember = { 
        id: MY_ID, 
        name: playerNameRef.current || 'OPERADOR', 
        pClass: playerClassRef.current, 
        isZombie: isZombieRef.current, 
        isDead: isDeadRef.current, 
        tasksCompleted: currentTaskIndexRef.current,
        coords: myCoords || undefined,
        isReady: gameStateRef.current === GameState.PLAYING,
        isHost: isHostRef.current,
        ...updates 
    };

    setRealSquad(prev => {
      const exists = prev.find(m => m.id === MY_ID);
      if (exists) return prev.map(m => m.id === MY_ID ? { ...m, ...myData } : m);
      return [...prev, myData];
    });

    channelRef.current.send({ type: 'broadcast', event: 'presence_sync', payload: myData });
  }, [myCoords]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyCoords(coords);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    syncLocalPresence();
  }, [playerName, playerClass, isZombie, isDead, currentTaskIndex, gameState, isHost, syncLocalPresence]);

  const addMessage = useCallback((text: string) => {
    const newMessage: ChatMessage = { 
      id: Math.random().toString(36).substring(7), 
      sender: playerNameRef.current || 'OPERADOR', 
      text, 
      type: 'TEXT',
      isZombie: isZombieRef.current,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: newMessage });
    }
  }, []);

  const handleSendToRadio = useCallback((data: { taskTitle: string, receiptId: string, timeLeft: number }) => {
    const receiptMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: playerNameRef.current || 'OPERADOR',
      text: `Tarefa Concluída: ${data.taskTitle}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'RECEIPT',
      isZombie: isZombieRef.current,
      metadata: data
    };
    setMessages(prev => [...prev, receiptMsg]);
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: receiptMsg });
    }
  }, []);

  const startGameLocal = useCallback(() => {
    const isInf = playerClassRef.current === 'INFECTADO' || playerClassRef.current === 'ZUMBI_PRIMORDIAL';
    setIsZombie(isInf);
    setIsDead(false);
    const initialTasks: Task[] = CLASS_DATA[playerClassRef.current].tasks.map((t: any, i: number) => ({
      id: i + 1, type: t.type, title: t.title, description: t.desc, code: t.code, data: t.data, validator: () => true
    }));
    setTasks(initialTasks);
    setCurrentTaskIndex(0);
    setTimeLeft(GAME_TIME_LIMIT);
    setIsTimerActive(false); 
    setGameState(GameState.PLAYING);
    syncLocalPresence({ tasksCompleted: 0, isZombie: isInf, isDead: false, isReady: true });
  }, [syncLocalPresence]);

  const broadcastStartGame = () => {
    if (!isHost) return;
    if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'game_start', payload: {} });
    }
    startGameLocal();
  };

  const handleGoBack = () => {
    if (channelRef.current) channelRef.current.unsubscribe();
    channelRef.current = null;
    setGameState(GameState.IDLE);
    setRoomCode('');
    setRealSquad([]);
    setMessages([]);
    setIsHost(false);
  };

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

  useEffect(() => {
    if (!supabase || !roomCode) return;
    
    const channel = supabase.channel(`room_${roomCode}`, {
        config: { broadcast: { self: false } }
    });

    channel.on('broadcast', { event: 'presence_sync' }, ({ payload }) => {
        setRealSquad(prev => {
          const exists = prev.find(m => m.id === payload.id);
          if (exists) return prev.map(m => m.id === payload.id ? { ...m, ...payload } : m);
          return [...prev, payload];
        });
    });

    channel.on('broadcast', { event: 'request_presence' }, () => {
        syncLocalPresence();
    });

    channel.on('broadcast', { event: 'game_start' }, () => {
        startGameLocal();
    });

    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      setMessages(prev => [...prev, payload]);
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

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            channelRef.current = channel;
            channel.send({ type: 'broadcast', event: 'request_presence', payload: {} });
            syncLocalPresence();
        }
    });

    return () => { 
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
        }
    };
  }, [roomCode, syncLocalPresence, startGameLocal]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const survivors = realSquad.filter(m => !m.isZombie && !m.isDead);
    if (survivors.length === 0 && realSquad.length > 0) {
      setGameState(GameState.FAILED);
      setEvaluation("EXTINÇÃO TOTAL. A HORDA DOMINOU O SETOR.");
      return;
    }
    const allHumansFinished = survivors.length > 0 && survivors.every(s => s.tasksCompleted === 4);
    if (allHumansFinished) {
      setGameState(GameState.FINISHED);
      setEvaluation("MISSÃO CUMPRIDA! EXTRAÇÃO AUTORIZADA.");
    }
  }, [realSquad, gameState]);

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
        
        <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 rounded-sm text-[10px] font-mono tracking-widest text-zinc-400 hover:text-white transition-all">
          <span className="text-sm">📻</span> RÁDIO
        </button>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center px-6 z-10">
        {gameState === GameState.IDLE && (
          <div className="w-full max-md text-center flex flex-col items-center">
            <div className="mb-12">
              <span className="text-[10px] font-mono tracking-[0.3em] text-[#b91c1c] uppercase block mb-1">PROTOCOLO DE REDE ATIVO</span>
              <h1 className="text-8xl font-header neon-text-red italic leading-none mb-6">OUTBREAK</h1>
            </div>
            <div className="w-full space-y-4 mb-8">
              <button onClick={() => { setIsHost(true); setRoomCode(Math.floor(1000+Math.random()*9000).toString()); setGameState(GameState.SELECT_CLASS); }} className="w-full py-10 btn-red text-white flex flex-col items-center justify-center rounded-sm">
                <span className="text-3xl font-header tracking-widest italic">CRIAR SALA</span>
              </button>
              <button onClick={() => { setIsHost(false); setGameState(GameState.JOIN_ROOM); }} className="w-full py-10 btn-outline text-white flex flex-col items-center justify-center rounded-sm">
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
                        if (gameState === GameState.JOIN_ROOM) { 
                          setRoomCode(joiningCode); 
                          setGameState(GameState.SELECT_CLASS); 
                        } else {
                          const found = Object.keys(CLASS_DATA).find(k => CLASS_DATA[k as PlayerClass].auth === authCode) as PlayerClass;
                          if (found) { setPlayerClass(found); setGameState(GameState.LOBBY); }
                          else { alert("CHAVE INVÁLIDA"); setAuthCode(''); }
                        }
                    }} className="w-full py-6 btn-red text-white text-2xl font-header tracking-widest italic disabled:opacity-20 rounded-sm" disabled={gameState === GameState.JOIN_ROOM ? joiningCode.length < 4 : (authCode.length < 8 || !playerName)}>
                    CONFIRMAR
                  </button>
                  <button onClick={() => {
                    if (!playerName) { alert("DÊ UM NOME AO SEU OPERADOR"); return; }
                    setPlayerClass('DEFAULT');
                    if (gameState === GameState.JOIN_ROOM) {
                       if (joiningCode.length < 4) { alert("DIGITE A FREQUÊNCIA DO CANAL"); return; }
                       setRoomCode(joiningCode);
                    }
                    setGameState(GameState.LOBBY);
                  }} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-80 border-white/20">
                    SEM CLASSE (SOBREVIVENTE)
                  </button>
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
                    <span className={`text-[9px] font-mono uppercase ${m.id === MY_ID ? 'text-[#b91c1c]' : 'text-zinc-500'}`}>
                        {m.isHost ? 'LÍDER' : CLASS_DATA[m.pClass].name} {m.id === MY_ID ? '(VOCÊ)' : ''}
                    </span>
                  </div>
                ))}
             </div>
             <div className="space-y-3">
                {isHost ? (
                  <button onClick={broadcastStartGame} className="w-full py-8 btn-red text-white text-4xl font-header tracking-widest italic rounded-sm">INICIAR MISSÃO</button>
                ) : (
                  <div className="w-full py-8 bg-zinc-900 border border-zinc-800 text-zinc-500 text-center text-xl font-header tracking-widest italic uppercase">Aguardando Líder...</div>
                )}
                <button onClick={() => setGameState(GameState.SELECT_CLASS)} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">VOLTAR PARA CLASSES</button>
             </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="w-full max-xl space-y-4 relative">
             {/* BARRA DE PROGRESSO GLOBAL */}
             <div className="w-full bg-[#111] border border-[#1f1f1f] h-6 relative rounded-sm overflow-hidden shadow-lg">
                <div 
                  className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(185,28,28,0.5)] ${isZombie ? 'bg-emerald-600' : 'bg-[#b91c1c]'}`}
                  style={{ width: `${globalProgress}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-black tracking-[0.4em] text-white drop-shadow-md">
                    PROGRESSO_MISSÃO: {globalProgress}%
                  </span>
                </div>
             </div>

             <div className={`flex items-center justify-between p-6 bg-[#050505] border border-[#1a1a1a] border-l-4 rounded-sm ${isZombie ? 'border-l-emerald-500' : 'border-l-[#b91c1c]'}`}>
                <div>
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">CRONÔMETRO_TERMINAL</span>
                   <span className={`text-6xl font-mono font-black italic tracking-tighter leading-none ${timeLeft < 25 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                      {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
                   </span>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">SINC_INDIVIDUAL</span>
                   <span className={`text-3xl font-header italic uppercase tracking-widest leading-none ${isZombie ? 'text-emerald-400' : 'text-[#b91c1c]'}`}>
                     {isZombie ? 'INFECTADO' : `TASK ${currentTaskIndex+1}/4`}
                   </span>
                </div>
             </div>

             <div className="bg-[#050505] border border-[#1a1a1a] p-1 min-h-[420px] flex items-center justify-center relative rounded-sm">
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
                    onComplete={() => {
                      setIsTimerActive(false);
                      setShowReceipt(true);
                    }} 
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
                {gameState === GameState.FINISHED ? 'VITÓRIA' : 'FRACASSO'}
             </h2>
             <p className="text-2xl font-mono italic">"{evaluation}"</p>
             <button onClick={handleGoBack} className="w-full py-6 btn-outline text-white font-header text-3xl uppercase tracking-widest italic rounded-sm">VOLTAR AO MENU</button>
          </div>
        )}
      </main>
      
      <Chat 
        messages={messages} 
        onSendMessage={addMessage} 
        isOpen={isChatOpen} 
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
