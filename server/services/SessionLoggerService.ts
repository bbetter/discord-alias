import pino from 'pino';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { LogEntry, LogFilter, SessionLogMetadata, LogTag, LogLevel } from '../../shared/types/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.resolve(__dirname, '../../..', 'logs');
const sessionsDir = path.join(logsDir, 'sessions');

// Max age for session logs (30 days)
const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export class SessionLoggerService {
  private sessionLoggers: Map<string, pino.Logger> = new Map();
  private sessionFiles: Map<string, string> = new Map();

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      if (!existsSync(sessionsDir)) {
        await fs.mkdir(sessionsDir, { recursive: true });
      }
    } catch (error) {
      console.error('[SessionLoggerService] Failed to create sessions directory:', error);
    }
  }

  /**
   * Start a new logging session for a game
   */
  startSession(gameId: string): pino.Logger {
    // If session already exists, return existing logger
    if (this.sessionLoggers.has(gameId)) {
      return this.sessionLoggers.get(gameId)!;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${gameId}-${timestamp}.log`;
    const filepath = path.join(sessionsDir, filename);

    const logger = pino(
      {
        level: 'debug',
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination({
        dest: filepath,
        sync: false, // Async writes for performance
        mkdir: true,
      })
    );

    this.sessionLoggers.set(gameId, logger);
    this.sessionFiles.set(gameId, filename);

    return logger;
  }

  /**
   * Get the logger for a specific game session
   */
  getLogger(gameId: string): pino.Logger | null {
    return this.sessionLoggers.get(gameId) || null;
  }

  /**
   * End a logging session (flush and close)
   */
  async endSession(gameId: string): Promise<void> {
    const logger = this.sessionLoggers.get(gameId);
    if (logger) {
      // Flush the logger
      await new Promise<void>((resolve) => {
        logger.flush(() => resolve());
      });
      this.sessionLoggers.delete(gameId);
      this.sessionFiles.delete(gameId);
    }
  }

  /**
   * Get session logs with optional filtering
   */
  async getSessionLogs(gameId: string, filter?: LogFilter): Promise<LogEntry[]> {
    try {
      // Find all log files for this gameId
      const files = await fs.readdir(sessionsDir);
      const gameFiles = files.filter((f) => f.startsWith(`${gameId}-`));

      if (gameFiles.length === 0) {
        return [];
      }

      // Read the most recent file (or all files if spanning multiple)
      const allLogs: LogEntry[] = [];

      for (const file of gameFiles) {
        const filepath = path.join(sessionsDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const logEntry: LogEntry = {
              timestamp: parsed.time || parsed.timestamp,
              level: parsed.level,
              tag: parsed.tag,
              message: parsed.msg || parsed.message,
              gameId: parsed.gameId,
              playerId: parsed.playerId,
              data: parsed,
            };
            allLogs.push(logEntry);
          } catch (err) {
            // Skip malformed lines
            continue;
          }
        }
      }

      // Apply filters
      let filteredLogs = allLogs;

      if (filter) {
        if (filter.level && filter.level !== 'all') {
          filteredLogs = filteredLogs.filter((log) => log.level === filter.level);
        }

        if (filter.tag && filter.tag !== 'all') {
          filteredLogs = filteredLogs.filter((log) => log.tag === filter.tag);
        }

        if (filter.startTime) {
          const startMs = filter.startTime.getTime();
          filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() >= startMs);
        }

        if (filter.endTime) {
          const endMs = filter.endTime.getTime();
          filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() <= endMs);
        }

        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filteredLogs = filteredLogs.filter((log) => log.message.toLowerCase().includes(searchLower));
        }

        if (filter.playerId) {
          filteredLogs = filteredLogs.filter((log) => log.playerId === filter.playerId);
        }

        // Apply pagination
        if (filter.offset) {
          filteredLogs = filteredLogs.slice(filter.offset);
        }

        if (filter.limit) {
          filteredLogs = filteredLogs.slice(0, filter.limit);
        }
      }

      return filteredLogs;
    } catch (error) {
      console.error('[SessionLoggerService] Failed to read session logs:', error);
      return [];
    }
  }

  /**
   * List all available session log files
   */
  async listSessions(): Promise<SessionLogMetadata[]> {
    try {
      const files = await fs.readdir(sessionsDir);
      const metadata: SessionLogMetadata[] = [];

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filepath = path.join(sessionsDir, file);
        const stats = await fs.stat(filepath);

        // Extract gameId from filename (format: {gameId}-{timestamp}.log)
        const gameId = file.split('-')[0];

        metadata.push({
          gameId,
          filename: file,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        });
      }

      // Sort by creation date (newest first)
      metadata.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return metadata;
    } catch (error) {
      console.error('[SessionLoggerService] Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Delete a session log file
   */
  async deleteSession(gameId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(sessionsDir);
      const gameFiles = files.filter((f) => f.startsWith(`${gameId}-`));

      for (const file of gameFiles) {
        const filepath = path.join(sessionsDir, file);
        await fs.unlink(filepath);
      }

      return true;
    } catch (error) {
      console.error('[SessionLoggerService] Failed to delete session logs:', error);
      return false;
    }
  }

  /**
   * Clean up old session logs (older than MAX_LOG_AGE_MS)
   */
  async cleanup(): Promise<number> {
    try {
      const files = await fs.readdir(sessionsDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filepath = path.join(sessionsDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.birthtimeMs;

        if (age > MAX_LOG_AGE_MS) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[SessionLoggerService] Cleaned up ${deletedCount} old log files`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[SessionLoggerService] Failed to cleanup old logs:', error);
      return 0;
    }
  }
}

// Singleton instance
export const sessionLoggerService = new SessionLoggerService();
