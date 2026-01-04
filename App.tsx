
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
const RADAR_COOLDOWN_MS = 120000; 

const CLASS_DATA: Record<PlayerClass, any> = {
  'MEDICO': { name: 'MÉDICO', auth: '#724#890', tasks: [
    { title: 'SUTURA DE EMERGÊNCIA', code: '189', type: 'LOCKPICK', desc: 'Realize suturas de alta precisão.', data: { pins: 5 } },
    { title: 'SINTETIZAR ANTÍGENO', code: '123', type: 'MEMORY', desc: 'Memorize a combinação química.', data: { sequence: [1, 2, 3, 6, 5, 4, 7, 8, 9] } },
    { title: 'DESCONTAMINAÇÃO', code: '167', type: 'MEMORY', desc: 'Limpeza viral.', data: { sequence: [1, 6, 7, 3, 9, 2, 4, 8, 5] } },
    { title: 'SISTEMA HOSPITALAR', code: '193', type: 'TYPING', desc: 'Sincronize o banco de dados.', data: { phrase: 'AUTORIZAR_SISTEMA_MEDICO_RECARGA_MOLECULAR_NIVEL_X9' } }
  ]},
  'CIENTISTA': { name: 'CIENTISTA', auth: '#655#918', tasks: [
    { title: 'ANALISAR DNA', code: '501', type: 'MEMORY', desc: 'Mapeie o DNA do Vírus-Z.', data: { sequence: [5, 0, 1, 8, 4, 7, 3, 2, 9] } },
    { title: 'ESTABILIZAR AMOSTRA', code: '534', type: 'WIRES', desc: 'Conecte os filamentos de antígenos.', data: { wireCount: 7 } },
    { title: 'FILTRAR PATÓGENO', code: '567', type: 'RADIO', desc: 'Filtre interferências.', data: {} },
    { title: 'NÚCLEO DE ENERGIA', code: '589', type: 'LOCKPICK', desc: 'Destrave o gerador.', data: { pins: 6 } }
  ]},
  'EXECUTOR': { name: 'EXECUTOR', auth: '#900#312', tasks: [
    { title: 'TRAVA DE SEGURANÇA', code: '601', type: 'LOCKPICK', desc: 'Libere o acesso ao armamento.', data: { pins: 6 } },
    { title: 'CERCA ELÉTRICA', code: '628', type: 'WIRES', desc: 'Religue o sistema de defesa.', data: { wireCount: 7 } },
    { title: 'ORDEM DE DISPARO', code: '654', type: 'TYPING', desc: 'Autentique bombardeio.', data: { phrase: 'CONFIRMAR_ALVO_BOMBARDEIO_ORBITAL_AREA_CONTAMINADA_7' } },
    { title: 'RÁDIO MILITAR', code: '689', type: 'WIRES', desc: 'Religue a comunicação.', data: { wireCount: 6 } }
  ]},
  'MAPEADOR': { name: 'MAPEADOR', auth: '#477#260', tasks: [
    { title: 'SINAL DE SATÉLITE', code: '701', type: 'RADIO', desc: 'Rastreie sinal de GPS.', data: {} },
    { title: 'GRAVAR COORDENADAS', code: '724', type: 'MEMORY', desc: 'Grave coordenadas de perigo.', data: { sequence: [7, 2, 4, 0, 5, 8, 1, 9, 3] } },
    { title: 'COFRE DE MAPAS', code: '758', type: 'LOCKPICK', desc: 'Destranque o arquivo.', data: { pins: 5 } },
    { title: 'PROTOCOLO DE FUGA', code: '789', type: 'TYPING', desc: 'Transmita rota de fuga.', data: { phrase: 'RECONFIGURAR_SATELITE_GPS_ROTA_FUGA_SETOR_DELTA_X' } }
  ]},
  'ZUMBI_PRIMORDIAL': { name: 'ZUMBI PRIMORDIAL', auth: '#666#131', tasks: [
    { title: 'PACIENTE ZERO', code: '---', type: 'INFECTADO_SECRET', desc: 'Inicie a dispersão.', data: {} },
    { title: 'SABOTAR CIRCUITOS', code: '423', type: 'WIRES', desc: 'Destrua as defesas.', data: { wireCount: 7 } },
    { title: 'GRITO DE CHAMADA', code: '446', type: 'MEMORY', desc: 'Atraia a horda.', data: { sequence: [4, 4, 6, 4, 4, 6, 1, 1, 9] } },
    { title: 'JAULAS BIOLÓGICAS', code: '478', type: 'LOCKPICK', desc: 'Solte as cobaias.', data: { pins: 6 } }
  ]},
  'INFECTADO': { name: 'INFECTADO', auth: '#812#541', tasks: [
    { title: 'AVANÇO VIRAL', code: '---', type: 'INFECTADO_SECRET', desc: 'O vírus toma conta.', data: {} },
    { title: 'SABOTAGEM', code: '423', type: 'WIRES', desc: 'Corte os fios.', data: { wireCount: 7 } },
    { title: 'RASTRO DE SANGUE', code: '446', type: 'MEMORY', desc: 'Siga o cheiro.', data: { sequence: [4, 4, 6, 1, 2, 9, 8, 7] } },
    { title: 'ARROMBAMENTO', code: '478', type: 'LOCKPICK', desc: 'Quebre a fechadura.', data: { pins: 5 } }
  ]},
  'DEFAULT': { name: 'SOBREVIVENTE', auth: '', tasks: [
    { title: 'BUSCAR COMIDA', code: '201', type: 'LOCKPICK', desc: 'Abra o armário de suprimentos.', data: { pins: 4 } },
    { title: 'GERADOR AUXILIAR', code: '214', type: 'WIRES', desc: 'Religue as luzes.', data: { wireCount: 6 } },
    { title: 'ITENS PERDIDOS', code: '237', type: 'MEMORY', desc: 'Busque ferramentas.', data: { sequence: [2, 3, 7, 5, 8, 0, 1, 4] } },
    { title: 'PEDIR AJUDA', code: '259', type: 'TYPING', desc: 'Envie sinal de rádio.', data: { phrase: 'S.O.S_PRECISAMOS_DE_EXTRACAO_IMEDIATA_PONTO_7' } }
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
  const [finalEvaluation, setFinalEvaluation] = useState<{title: string, msg: string, success: boolean}>({title: '', msg: '', success: false});
  const [showReceipt, setShowReceipt] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [radarTimer, setRadarTimer] = useState(0);
  const [lastRadarUseTime, setLastRadarUseTime] = useState(0);
  const [myCoords, setMyCoords] = useState<{lat: number, lng: number} | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showTargetMenu, setShowTargetMenu] = useState<'INFECT' | 'HEAL' | 'KILL' | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerNameRef = useRef(playerName);
  const playerClassRef = useRef(playerClass);
  const isZombieRef = useRef(isZombie);
  const isDeadRef = useRef(isDead);
  const currentTaskIndexRef = useRef(currentTaskIndex);
  const gameStateRef = useRef(gameState);

  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { playerClassRef.current = playerClass; }, [playerClass]);
  useEffect(() => { isZombieRef.current = isZombie; }, [isZombie]);
  useEffect(() => { isDeadRef.current = isDead; }, [isDead]);
  useEffect(() => { currentTaskIndexRef.current = currentTaskIndex; }, [currentTaskIndex]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

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
      .filter(m => m.dist <= PROXIMITY_ACTION_RANGE)
      .sort((a, b) => a.dist - b.dist);
  }, [realSquad, myCoords]);

  const hasAllyNearby = useMemo(() => {
    return nearbyPlayers.some(p => p.isZombie);
  }, [nearbyPlayers]);

  const globalProgress = useMemo(() => {
    const potentialHumans = realSquad.filter(m => m.pClass !== 'ZUMBI_PRIMORDIAL');
    if (potentialHumans.length === 0) return 0;
    const totalNeededTasks = potentialHumans.length * TOTAL_TASKS_PER_PLAYER;
    const currentCompleted = potentialHumans.reduce((acc, m) => acc + m.tasksCompleted, 0);
    return Math.min(Math.round((currentCompleted / totalNeededTasks) * 100), 100);
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
        isHost: isHost,
        ...updates 
    };
    channelRef.current.send({ type: 'broadcast', event: 'presence_sync', payload: myData });
  }, [myCoords, isHost]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    syncLocalPresence();
  }, [playerName, playerClass, isZombie, isDead, currentTaskIndex, gameState, syncLocalPresence]);

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
      text: `Task Concluída: ${data.taskTitle}`,
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

  const handleAction = (type: 'INFECT' | 'HEAL' | 'KILL', targetId: string) => {
    if (!channelRef.current) return;
    const eventName = type === 'INFECT' ? 'infection_attempt' : type === 'HEAL' ? 'heal_attempt' : 'kill_attempt';
    channelRef.current.send({ type: 'broadcast', event: eventName, payload: { targetId } });
    setShowTargetMenu(null);
    setActionFeedback(`PROTOCOLO ${type} TRANSMITIDO.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const startRadar = () => {
    const now = Date.now();
    if (now - lastRadarUseTime < RADAR_COOLDOWN_MS) return;
    if (playerClass === 'ZUMBI_PRIMORDIAL' && !hasAllyNearby) {
      setActionFeedback("SINAL BLOQUEADO. APROXIME-SE DE OUTROS ZUMBIS.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    setLastRadarUseTime(now);
    setRadarTimer(60);
    setShowRadar(true);
    radarIntervalRef.current = setInterval(() => {
      setRadarTimer(prev => {
        if (prev <= 1) {
          clearInterval(radarIntervalRef.current!);
          setShowRadar(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
    setAuthCode('');
    setJoiningCode('');
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING && isTimerActive && !showReceipt && !showRadar) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => { 
          if (prev <= 1) { 
            setIsTimerActive(false);
            return 0; 
          } 
          return prev - 1; 
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, isTimerActive, showReceipt, showRadar]);

  useEffect(() => {
     if (timeLeft === 0 && gameState === GameState.PLAYING && isTimerActive) {
        setActionFeedback("TERMINAL REINICIANDO EM 3s...");
        setTimeout(() => {
           setTimeLeft(GAME_TIME_LIMIT);
           setIsTimerActive(false);
           setActionFeedback(null);
        }, 3000);
     }
  }, [timeLeft, gameState, isTimerActive]);

  useEffect(() => {
    if (!supabase || !roomCode) return;
    const channel = supabase.channel(`room_${roomCode}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'presence_sync' }, ({ payload }) => {
        setRealSquad(prev => {
          const exists = prev.find(m => m.id === payload.id);
          if (exists) return prev.map(m => m.id === payload.id ? { ...m, ...payload } : m);
          return [...prev, payload];
        });
    });
    channel.on('broadcast', { event: 'request_presence' }, () => syncLocalPresence());
    channel.on('broadcast', { event: 'game_start' }, () => startGameLocal());
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => setMessages(prev => [...prev, payload]));
    channel.on('broadcast', { event: 'infection_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsZombie(true);
            setIsDead(false);
            syncLocalPresence({ isZombie: true, isDead: false, tasksCompleted: 0 });
            setActionFeedback("SINAL VITAL ALTERADO: VOCÊ FOI INFECTADO!");
        }
    });
    channel.on('broadcast', { event: 'heal_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsZombie(false);
            setIsDead(false);
            syncLocalPresence({ isZombie: false, isDead: false, pClass: 'DEFAULT' });
            setActionFeedback("ANTÍGENO APLICADO! CURA EM PROGRESSO.");
        }
    });
    channel.on('broadcast', { event: 'kill_attempt' }, ({ payload }) => {
        if (payload.targetId === MY_ID) {
            setIsDead(true);
            setIsZombie(true);
            syncLocalPresence({ isDead: true, isZombie: true, tasksCompleted: 0 });
            setActionFeedback("ELIMINAÇÃO CONFIRMADA PELO EXECUTOR.");
        }
    });
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            channelRef.current = channel;
            channel.send({ type: 'broadcast', event: 'request_presence', payload: {} });
            syncLocalPresence();
        }
    });
    return () => { if (channelRef.current) channelRef.current.unsubscribe(); };
  }, [roomCode, syncLocalPresence, startGameLocal]);

  // LOGICA DE FINAIS DINÂMICOS COM MENSAGENS POR FACÇÃO
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const potentialHumans = realSquad.filter(m => m.pClass !== 'ZUMBI_PRIMORDIAL');
    const aliveHumans = potentialHumans.filter(m => !m.isZombie && !m.isDead);
    const primordial = realSquad.find(m => m.pClass === 'ZUMBI_PRIMORDIAL');
    const medico = realSquad.find(m => m.pClass === 'MEDICO');
    
    // CENÁRIO: VITÓRIA DA HORDA (TODOS HUMANOS INFECTADOS)
    if (aliveHumans.length === 0 && potentialHumans.length > 0) {
      if (isZombie) {
        setFinalEvaluation({
            title: "PARABÉNS! VITÓRIA DA HORDA",
            msg: "O mundo é nosso. Não restam corações batendo neste setor. O banquete final começou e a dispersão foi um sucesso absoluto.",
            success: true
        });
      } else {
        setFinalEvaluation({
            title: "VOCÊS PERDERAM! HUMANIDADE EXTINTA",
            msg: "O último suspiro humano foi silenciado. A infecção tomou cada célula do esquadrão. O setor foi oficialmente perdido para a escuridão.",
            success: false
        });
      }
      setGameState(GameState.FINISHED);
      return;
    }

    // CENÁRIO: VITÓRIA DOS HUMANOS (TASKS COMPLETAS)
    const allHumansFinished = potentialHumans.length > 0 && potentialHumans.every(s => s.tasksCompleted >= 4);
    if (allHumansFinished) {
      if (isZombie) {
        setFinalEvaluation({
            title: "VOCÊS PERDERAM! ALVO ESCAPOU",
            msg: "Os humanos foram rápidos demais. Eles selaram o setor e garantiram a extração. A horda terá que procurar carne fresca em outro lugar.",
            success: false
        });
      } else {
        let customMsg = "PARABÉNS! Vocês resistiram ao Outbreak e garantiram a extração. A humanidade respira por mais um dia graças ao seu esforço.";
        if (primordial && primordial.isDead) {
            customMsg = "PARABÉNS! VITÓRIA LENDÁRIA! O Zumbi Primordial foi neutralizado e as tarefas concluídas. O setor está limpo para a extração segura.";
        } else if (medico && (medico.isDead || medico.isZombie)) {
            customMsg = "PARABÉNS? FUGA AMARGA. A missão foi concluída, mas o Médico caiu. Vocês escaparam, mas sem uma cura, o futuro permanece incerto.";
        }
        setFinalEvaluation({
            title: "PARABÉNS! VITÓRIA DOS SOBREVIVENTES",
            msg: customMsg,
            success: true
        });
      }
      setGameState(GameState.FINISHED);
    }
  }, [realSquad, gameState, isZombie]);

  return (
    <div className={`min-h-screen bg-black text-white flex flex-col items-center relative overflow-hidden ${nearbyPlayers.length > 0 ? 'animate-proximity-pulse' : ''}`}>
      <header className="w-full p-6 flex justify-between items-start z-10 max-w-2xl">
        <div className="flex items-start gap-4">
           <div className={`w-12 h-12 flex items-center justify-center rounded-sm ${(isDead || isZombie) ? 'bg-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-[#b91c1c] shadow-[0_0_15px_rgba(185,28,28,0.5)]'}`}>
              <span className="text-2xl">{(isDead || isZombie) ? '☣️' : '💀'}</span>
           </div>
           <div className="flex flex-col">
              <h1 className="text-4xl font-header tracking-tight leading-none">OUTBREAK_OS</h1>
              <span className={`text-[10px] font-mono tracking-[0.3em] uppercase ${(isDead || isZombie) ? 'text-emerald-500 font-bold' : 'text-[#b91c1c]'}`}>
                {isDead ? 'TERMINAL MORTO' : isZombie ? 'INFECTADO' : 'SISTEMA_ATIVO'}
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
                   <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">NOME_OPERADOR</label>
                   <input type="text" maxLength={12} value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} placeholder="DIGITE..." className="w-full bg-transparent text-2xl font-mono text-white outline-none placeholder:opacity-10" />
                </div>
                {gameState === GameState.JOIN_ROOM ? (
                   <div className="bg-[#050505] border border-[#1a1a1a] p-4 text-center">
                      <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">FREQUÊNCIA</label>
                      <div className="text-4xl font-mono tracking-[0.2em] text-[#b91c1c] h-12 flex items-center justify-center">{joiningCode.padEnd(4, '_')}</div>
                   </div>
                ) : (
                   <div className="bg-[#050505] border border-[#1a1a1a] p-4 text-center">
                      <label className="text-[9px] font-mono text-zinc-600 uppercase mb-2 block">CÓDIGO_CLASSE</label>
                      <div className="text-4xl font-mono tracking-[0.2em] text-[#b91c1c] h-12 flex items-center justify-center">{authCode.padEnd(8, '_')}</div>
                   </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9, gameState === GameState.SELECT_CLASS ? '#' : 'C', 0, 'DEL'].map(k => (
                     <button key={k} onClick={() => {
                        if (k === 'DEL') (gameState === GameState.SELECT_CLASS ? setAuthCode(prev => prev.slice(0, -1)) : setJoiningCode(prev => prev.slice(0, -1)));
                        else if (k === 'C') setJoiningCode('');
                        else if (k === '#') { if (gameState === GameState.SELECT_CLASS && authCode.length < 8) setAuthCode(prev => prev + k); }
                        else { if (gameState === GameState.SELECT_CLASS) { if (authCode.length < 8) setAuthCode(prev => prev + k); } else { if (joiningCode.length < 4) setJoiningCode(prev => prev + k); } }
                     }} className="py-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-xl font-bold transition-all">{k}</button>
                   ))}
                </div>
                <div className="space-y-3">
                  <button onClick={() => {
                      if (gameState === GameState.JOIN_ROOM) { setRoomCode(joiningCode); setGameState(GameState.SELECT_CLASS); } 
                      else {
                          const found = Object.keys(CLASS_DATA).find(k => CLASS_DATA[k as PlayerClass].auth === authCode) as PlayerClass;
                          if (found) { setPlayerClass(found); setGameState(GameState.LOBBY); }
                          else { alert("ACESSO NEGADO"); setAuthCode(''); }
                      }
                  }} className="w-full py-6 btn-red text-white text-2xl font-header tracking-widest italic rounded-sm disabled:opacity-30" disabled={!playerName}>CONFIRMAR</button>
                  <button onClick={handleGoBack} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">VOLTAR AO MENU</button>
                </div>
             </div>
           </div>
        )}

        {gameState === GameState.LOBBY && (
          <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500 text-center">
             <h2 className="text-4xl font-header italic uppercase tracking-widest border-b border-[#1f1f1f] pb-4">SQUAD #{roomCode}</h2>
             <div className="space-y-2 max-h-64 overflow-y-auto">
                {realSquad.map(m => (
                  <div key={m.id} className="p-4 bg-[#050505] border border-[#1a1a1a] flex justify-between items-center rounded-sm">
                    <span className="text-xl font-header uppercase italic tracking-widest">{m.name}</span>
                    <span className={`text-[9px] font-mono uppercase text-zinc-500`}>{CLASS_DATA[m.pClass].name}</span>
                  </div>
                ))}
             </div>
             <div className="space-y-3">
                {isHost ? (
                  <button onClick={broadcastStartGame} className="w-full py-8 btn-red text-white text-4xl font-header tracking-widest italic rounded-sm">INICIAR MISSÃO</button>
                ) : (
                  <div className="w-full py-8 bg-zinc-900 border border-zinc-800 text-zinc-500 text-xl font-header tracking-widest italic uppercase">Aguardando Líder...</div>
                )}
                <button onClick={handleGoBack} className="w-full py-4 btn-outline text-white text-xl font-header tracking-widest italic rounded-sm opacity-60">SAIR DA SALA</button>
             </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="w-full max-xl space-y-4 relative">
             <div className="w-full bg-[#111] border border-[#1f1f1f] h-6 relative rounded-sm overflow-hidden shadow-lg">
                <div className={`h-full transition-all duration-1000 ${isZombie ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-[#b91c1c] shadow-[0_0_15px_rgba(185,28,28,0.5)]'}`} style={{ width: `${globalProgress}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-black tracking-[0.4em] text-white drop-shadow-md">PROGRESSO_HUMANO: {globalProgress}%</span>
                </div>
             </div>

             <div className={`flex items-center justify-between p-6 bg-[#050505] border border-[#1a1a1a] border-l-4 rounded-sm ${isZombie ? 'border-l-emerald-500' : 'border-l-[#b91c1c]'}`}>
                <div>
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">CRONÔMETRO</span>
                   <span className={`text-6xl font-mono font-black italic tracking-tighter leading-none ${timeLeft < 25 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                      {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
                   </span>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-mono text-zinc-600 uppercase mb-1 block">ETAPA</span>
                   <span className={`text-3xl font-header italic uppercase tracking-widest leading-none ${isZombie ? 'text-emerald-400' : 'text-[#b91c1c]'}`}>
                     {isZombie ? 'HORDA' : `TASK ${currentTaskIndex+1}/4`}
                   </span>
                </div>
             </div>

             <div className="bg-[#050505] border border-[#1a1a1a] p-1 min-h-[420px] flex items-center justify-center relative rounded-sm">
                {showReceipt ? (
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
                    key={currentTaskIndex} 
                    task={tasks[currentTaskIndex]} 
                    onUnlock={() => setIsTimerActive(true)} 
                    onComplete={() => { setIsTimerActive(false); setShowReceipt(true); }} 
                  />
                )}
             </div>

             <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50">
                {(playerClass === 'MAPEADOR') && !isDead && (
                   <button 
                    disabled={Date.now() - lastRadarUseTime < RADAR_COOLDOWN_MS}
                    onClick={startRadar} 
                    className="p-6 bg-blue-900/80 border border-blue-400 text-white rounded-full shadow-2xl disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
                   >
                     <span className="text-2xl">📡</span>
                   </button>
                )}
                {playerClass === 'ZUMBI_PRIMORDIAL' && !isDead && (
                   <button 
                    onClick={startRadar} 
                    className={`p-6 border text-white rounded-full shadow-2xl transition-all hover:scale-110 ${hasAllyNearby ? 'bg-emerald-900 border-emerald-500 animate-pulse' : 'bg-zinc-900 border-zinc-700 opacity-50'}`}
                   >
                     <span className="text-2xl">📡</span>
                     {!hasAllyNearby && <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[8px] font-mono bg-black text-red-500 px-2 py-1 border border-red-500 rounded-sm whitespace-nowrap">SEMPRE_COM_A_HORDA</span>}
                   </button>
                )}
                {playerClass === 'MEDICO' && nearbyPlayers.some(p => p.isZombie) && (
                   <button onClick={() => setShowTargetMenu('HEAL')} className="p-6 bg-emerald-600/80 border border-emerald-300 text-white rounded-full shadow-2xl hover:scale-110">
                     <span className="text-2xl">💉</span>
                   </button>
                )}
                {playerClass === 'EXECUTOR' && nearbyPlayers.some(p => p.isZombie) && (
                   <button onClick={() => setShowTargetMenu('KILL')} className="p-6 bg-red-600/80 border border-red-300 text-white rounded-full shadow-2xl hover:scale-110">
                     <span className="text-2xl">🔫</span>
                   </button>
                )}
                {(playerClass === 'INFECTADO' || playerClass === 'ZUMBI_PRIMORDIAL') && nearbyPlayers.some(p => !p.isZombie && !p.isDead) && (
                   <button onClick={() => setShowTargetMenu('INFECT')} className="p-6 bg-emerald-900/80 border border-emerald-500 text-white rounded-full shadow-2xl animate-pulse hover:scale-110">
                     <span className="text-2xl">☣️</span>
                   </button>
                )}
             </div>
          </div>
        )}

        {(gameState === GameState.FINISHED || gameState === GameState.FAILED) && (
          <div className="w-full max-md text-center space-y-8 py-10 animate-in zoom-in duration-500">
             <div className={`p-1 w-32 h-32 mx-auto rounded-full flex flex-col items-center justify-center border-4 ${finalEvaluation.success ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'border-red-600 shadow-[0_0_30px_rgba(185,28,28,0.5)]'}`}>
                <span className="text-6xl mb-1">{finalEvaluation.success ? '🏆' : '💀'}</span>
                <span className="text-[10px] font-mono font-black">{finalEvaluation.success ? 'SUCCESS' : 'FAILED'}</span>
             </div>
             
             <div className="space-y-4">
                <h2 className={`text-6xl font-header italic leading-tight uppercase ${finalEvaluation.success ? 'text-emerald-500' : 'text-[#b91c1c]'}`}>
                    {finalEvaluation.title}
                </h2>
                <div className="bg-[#050505] border border-[#1a1a1a] p-8 rounded-sm relative overflow-hidden group">
                    <div className={`absolute inset-0 opacity-5 ${finalEvaluation.success ? 'bg-emerald-500' : 'bg-red-600'}`}></div>
                    <p className="text-2xl font-mono italic leading-relaxed text-zinc-200 relative z-10">"{finalEvaluation.msg}"</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <button onClick={handleGoBack} className="w-full py-6 btn-red text-white font-header text-3xl uppercase tracking-widest italic rounded-sm shadow-2xl transition-all hover:scale-[1.02] active:scale-95">VOLTAR AO MENU PRINCIPAL</button>
             </div>
          </div>
        )}
      </main>

      {showTargetMenu && (
         <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 p-8 rounded-sm space-y-6 shadow-2xl">
               <h3 className="text-3xl font-header italic tracking-widest text-center uppercase">Selecionar Alvo</h3>
               <div className="space-y-3">
                  {nearbyPlayers
                    .filter(p => {
                      if (showTargetMenu === 'INFECT') return !p.isZombie && !p.isDead;
                      if (showTargetMenu === 'HEAL') return p.isZombie && !p.isDead;
                      if (showTargetMenu === 'KILL') return p.isZombie;
                      return false;
                    })
                    .map(p => (
                      <button key={p.id} onClick={() => handleAction(showTargetMenu, p.id)} className="w-full p-4 bg-zinc-900 border border-zinc-800 flex justify-between items-center hover:border-white/20 transition-all active:scale-95">
                        <span className="font-header text-2xl tracking-widest italic">{p.name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{Math.round(p.dist)}M</span>
                      </button>
                    ))}
               </div>
               <button onClick={() => setShowTargetMenu(null)} className="w-full py-4 text-zinc-500 font-mono text-xs uppercase tracking-widest border border-transparent hover:border-zinc-800">CANCELAR</button>
            </div>
         </div>
      )}

      {actionFeedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-8 py-4 font-header text-2xl italic tracking-widest shadow-2xl animate-in slide-in-from-top border-2 border-white/20">
           {actionFeedback}
        </div>
      )}

      {showRadar && (
        <TrackerMap 
          members={realSquad} 
          myId={MY_ID} 
          timeLeft={radarTimer} 
          range={playerClass === 'MAPEADOR' ? 50 : 25}
          isMapeador={playerClass === 'MAPEADOR'}
          isPrimordial={playerClass === 'ZUMBI_PRIMORDIAL'}
          onClose={() => setShowRadar(false)} 
        />
      )}
      
      <Chat messages={messages} onSendMessage={addMessage} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} playerName={playerName} />
      
      <style>{`
        @keyframes proximity-pulse {
          0% { box-shadow: inset 0 0 50px rgba(245, 158, 11, 0); }
          50% { box-shadow: inset 0 0 80px rgba(245, 158, 11, 0.2); }
          100% { box-shadow: inset 0 0 50px rgba(245, 158, 11, 0); }
        }
        .animate-proximity-pulse { animation: proximity-pulse 1.5s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
