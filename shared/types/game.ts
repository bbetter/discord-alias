export type GameStatus = 'lobby' | 'countdown' | 'playing' | 'round-end' | 'last-word-steal' | 'dispute' | 'finished';
export type TeamId = 'teamA' | 'teamB';
export type WordStatus = 'pending' | 'correct' | 'skipped';
// Category is dynamic - populated from wordpacks. 'змішані' is special and means "all categories"
export type Category = string;
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
  skipPenalty: number; // Points deducted for each skipped word (default: -1, 0 = no penalty)
  lastWordStealEnabled: boolean; // Whether enemy team can steal the last unanswered word (default: false)
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

export interface DisputeInfo {
  disputeId: string;
  roundNumber: number;
  wordIndex: number;
  word: string;
  originalStatus: WordStatus;
  proposedStatus: WordStatus;
  initiatedBy: Player;
  reason: string;
  votes: Record<string, 'agree' | 'disagree'>;
  createdAt: string;
  resolvedAt?: string;
  resolution?: 'accepted' | 'rejected' | 'tied';
}

export interface PresenceInfo {
  connected: boolean;
  lastSeen: string;
  // Map of socketId -> true to track multiple connections per player
  connections?: Record<string, boolean>;
}

export interface LastWordStealInfo {
  word: string;
  difficulty: string;
  stealingTeam: TeamId; // The team that can steal
  startTime: number;
  timeRemaining: number;
  originalTeam: TeamId; // The team that failed to answer
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
  lastWordSteal: LastWordStealInfo | null;
  history: RoundHistory[];
  roundNumber: number;
  teamARounds: number;
  teamBRounds: number;
  currentTeam: TeamId;
  winner?: TeamId;
  updatedAt?: string;
  previousGameId?: string;
  currentDispute: DisputeInfo | null;
  disputeQueue: DisputeInfo[];
  disputeHistory: DisputeInfo[];
  usedWords: string[];
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
