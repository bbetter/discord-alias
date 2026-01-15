import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ADMIN');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      tag: 'ADMIN',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress,
      action: 'http_request',
    }, `[ADMIN] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}
