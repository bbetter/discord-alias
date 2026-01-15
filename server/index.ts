import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { SocketHandler } from './handlers/SocketHandler.js';
import { GameService } from './services/GameService.js';
import { SnapshotService } from './services/SnapshotService.js';
import { sessionLoggerService } from './services/SessionLoggerService.js';
import { createLogger, disableConsoleInProduction } from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import adminRoutes from './admin/admin-routes.js';

const serverLogger = createLogger('SERVER');
const authLogger = createLogger('AUTH');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Services
const snapshotService = new SnapshotService();
const gameService = new GameService(snapshotService);

// Main App
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = Number(process.env.PORT) || 3000;

// Admin App
const adminApp = express();
const ADMIN_PORT = Number(process.env.ADMIN_PORT) || 3001;

// Middleware
app.use(express.json());
adminApp.use(express.json());
adminApp.use(requestLogger);

// Static Files
app.use(express.static(distPath));

// Main API
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Alias game server is running' });
});

// OAuth2 token exchange
app.post('/api/token', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!redirectUri) {
      authLogger.error({ tag: 'ERROR', error: 'DISCORD_REDIRECT_URI not configured' }, '[ERROR] Discord config missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!clientId) {
      authLogger.error({ tag: 'ERROR', error: 'VITE_DISCORD_CLIENT_ID not configured' }, '[ERROR] Discord config missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!clientSecret) {
      authLogger.error({ tag: 'ERROR', error: 'DISCORD_CLIENT_SECRET not configured' }, '[ERROR] Discord config missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
      authLogger.error({ tag: 'AUTH', error: 'Discord token exchange failed', status: tokenResponse.status }, '[AUTH] Token exchange failed');
      return res.status(tokenResponse.status).json(tokenData);
    }

    // Return token data - client will use authenticate() to get user info
    const authResponse = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    };

    authLogger.info({ tag: 'AUTH', action: 'token_exchange_success' }, '[AUTH] Discord token exchange successful');
    res.json(authResponse);
  } catch (err) {
    authLogger.error({ tag: 'ERROR', error: err instanceof Error ? err.message : 'Unknown error' }, '[ERROR] Token exchange error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Main UI Fallback
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Admin UI
adminApp.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'admin.html'));
});

adminApp.use(express.static(distPath, { index: false }));

// Admin API (inject gameService and snapshotService)
app.locals.gameService = gameService;
app.locals.snapshotService = snapshotService;
adminApp.locals.gameService = gameService;
adminApp.locals.snapshotService = snapshotService;

adminApp.use('/admin/api', adminRoutes);

// Bootstrap
async function bootstrap(): Promise<void> {
  // Disable console logging in production
  disableConsoleInProduction();

  // Run log cleanup on startup
  const deletedCount = await sessionLoggerService.cleanup();
  if (deletedCount > 0) {
    serverLogger.info({ tag: 'SERVER', deletedCount }, `[SERVER] Cleaned up ${deletedCount} old log files`);
  }

  const socketHandler = new SocketHandler(gameService, snapshotService);
  socketHandler.setupHandlers(io);

  httpServer.listen(PORT, '0.0.0.0', () => {
    serverLogger.info({ tag: 'SERVER', port: PORT }, `[SERVER] Alias Game Server running on port ${PORT}`);
  });

  adminApp.listen(ADMIN_PORT, '0.0.0.0', () => {
    serverLogger.info({ tag: 'SERVER', port: ADMIN_PORT }, `[SERVER] Admin server running on port ${ADMIN_PORT}`);
  });
}

bootstrap();

// Graceful Shutdown
process.on('SIGTERM', () => {
  serverLogger.info({ tag: 'SERVER' }, '[SERVER] SIGTERM received, shutting down');
  httpServer.close(() => serverLogger.info({ tag: 'SERVER' }, '[SERVER] Main server closed'));
});

// Export services for use in other modules
export { gameService, snapshotService };
