
export enum GameState {
  IDLE = 'IDLE',
  SELECT_CLASS = 'SELECT_CLASS',
  JOIN_ROOM = 'JOIN_ROOM',
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED'
}

export type PlayerClass = 'MEDICO' | 'CIENTISTA' | 'EXECUTOR' | 'MAPEADOR' | 'INFECTADO' | 'ZUMBI_PRIMORDIAL' | 'DEFAULT';

export type TaskType = 'MATH' | 'SEQUENCE' | 'COLOR' | 'TYPING' | 'MEMORY' | 'WIRES' | 'LOCKPICK' | 'RADIO' | 'INFECTADO_SECRET';

export interface Task {
  id: number;
  type: TaskType;
  title: string;
  description: string;
  code: string;
  data: any;
  validator: (input: any) => boolean;
}

export interface GameStats {
  score: number;
  timeRemaining: number;
  completedTasks: number;
  totalTasks: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  type: 'TEXT' | 'RECEIPT' | 'SYSTEM';
  playerClass?: PlayerClass;
  isZombie?: boolean;
  metadata?: {
    taskTitle: string;
    receiptId: string;
    timeLeft: number;
  };
}

export interface SquadMember {
  id: string;
  name: string;
  pClass: PlayerClass;
  isReady: boolean;
  isHost: boolean;
  isZombie?: boolean;
  isHealed?: boolean;
  isDead?: boolean;
  tasksCompleted: number;
  coords?: {
    lat: number;
    lng: number;
  };
}
