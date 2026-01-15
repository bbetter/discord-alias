export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogTag =
  | 'GAME'
  | 'SOCKET'
  | 'PLAYER'
  | 'ROUND'
  | 'DISPUTE'
  | 'ERROR'
  | 'AUTH'
  | 'ADMIN'
  | 'SERVER';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: LogTag;
  message: string;
  gameId?: string;
  playerId?: string;
  data?: Record<string, any>;
}

export interface LogFilter {
  level?: LogLevel | 'all';
  tag?: LogTag | 'all';
  startTime?: Date;
  endTime?: Date;
  search?: string;
  playerId?: string;
  limit?: number;
  offset?: number;
}

export interface SessionLogMetadata {
  gameId: string;
  filename: string;
  createdAt: string;
  size: number;
  entriesCount?: number;
}
