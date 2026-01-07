export type GameStatus = 'lobby' | 'countdown' | 'playing' | 'round-end' | 'finished';
export type TeamId = 'teamA' | 'teamB';
export type WordStatus = 'pending' | 'correct' | 'skipped';
export type Category = 'змішані' | 'тварини' | 'предмети' | 'дії' | 'місця' | 'різне';
export type Difficulty = 'змішані' | 'легкі' | 'середні' | 'складні';

export interface Player {
  id: string;
  username: string;
  avatar?: string;
}

export interface WordCard {
  word: string;
  difficulty: string;
  status: WordStatus;
}

export interface Team {
  name: string;
  players: Player[];
  score: number;
}

export interface GameSettings {
  roundTime: number;
  category: Category;
  difficulty: Difficulty;
  pointsToWin: number;
  wordsPerRound: number;
}

export interface CurrentRound {
  team: TeamId;
  explainer: Player;
  wordIndex: number;
  cards: WordCard[];
  startTime: number;
  timeRemaining: number;
  correctCount: number;
  skippedCount: number;
}

export interface RoundHistory {
  roundNumber: number;
  team: TeamId;
  explainer: Player;
  cards: WordCard[];
  correctCount: number;
  skippedCount: number;
  points: number;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export interface PresenceInfo {
  connected: boolean;
  lastSeen: string;
  // Map of socketId -> true to track multiple connections per player
  connections?: Record<string, boolean>;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  host: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  settings: GameSettings;
  teams: {
    teamA: Team;
    teamB: Team;
  };
  presence: Record<string, PresenceInfo>;
  currentRound: CurrentRound | null;
  history: RoundHistory[];
  roundNumber: number;
  teamARounds: number;
  teamBRounds: number;
  currentTeam: TeamId;
  winner?: TeamId;
  updatedAt?: string;
  previousGameId?: string;
}

export interface GameSummary {
  gameId: string;
  status: GameStatus;
  playerCount: number;
  roundNumber: number;
  teamAScore: number;
  teamBScore: number;
  createdAt: string;
  host: string;
}

export interface QuitWarnings {
  teamBelowMinimum: boolean;
  isCurrentExplainer: boolean;
  teamId: TeamId | null;
  teamSize: number;
}
