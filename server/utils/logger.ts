import pino from 'pino';
import { LogTag } from '../../shared/types/logging.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';

// Base directory for logs
const logsDir = path.resolve(__dirname, '../../..', 'logs');
const serverLogsDir = path.join(logsDir, 'server');

// Create date string for daily log rotation
const getDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Base Pino logger configuration
const baseLoggerOptions: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Transport configuration
const transport = pino.transport({
  targets: [
    // Console transport (development only, with pretty printing)
    ...(isDevelopment
      ? [
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        ]
      : []),
    // File transport (always enabled)
    {
      target: 'pino-roll',
      level: isDevelopment ? 'debug' : 'info',
      options: {
        file: path.join(serverLogsDir, `app-${getDateString()}.log`),
        frequency: 'daily',
        mkdir: true,
      },
    },
  ],
});

// Root logger instance
const rootLogger = pino(baseLoggerOptions, transport);

/**
 * Create a tagged logger with optional context
 */
export function createLogger(tag: LogTag, context?: Record<string, any>) {
  return rootLogger.child({
    tag,
    ...context,
  });
}

/**
 * Get the root logger (for server-level logging)
 */
export function getRootLogger() {
  return rootLogger;
}

/**
 * Disable console logging in production
 * This should be called during server initialization
 */
export function disableConsoleInProduction() {
  if (!isDevelopment) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    // Keep console.error for critical errors
  }
}

export default {
  createLogger,
  getRootLogger,
  disableConsoleInProduction,
};
