import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { SocketHandler } from './handlers/SocketHandler.js';
import { GameService } from './services/GameService.js';
import { SnapshotService } from './services/SnapshotService.js';
import adminRoutes from './admin/admin-routes.js';

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
      console.error('DISCORD_REDIRECT_URI not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!clientId) {
      console.error('VITE_DISCORD_CLIENT_ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!clientSecret) {
      console.error('DISCORD_CLIENT_SECRET not configured');
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
      console.error('Discord token exchange failed:', tokenData);
      return res.status(tokenResponse.status).json(tokenData);
    }

    // Return token data - client will use authenticate() to get user info
    const authResponse = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    };

    console.log(`✅ Discord token exchange successful`);
    res.json(authResponse);
  } catch (err) {
    console.error('Token exchange error:', err);
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
  const socketHandler = new SocketHandler(gameService, snapshotService);
  socketHandler.setupHandlers(io);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Alias Game Server running on :${PORT}`);
  });

  adminApp.listen(ADMIN_PORT, '0.0.0.0', () => {
    console.log(`🛠 Admin server running on :${ADMIN_PORT}`);
  });
}

bootstrap();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => console.log('Main server closed'));
});

// Export services for use in other modules
export { gameService, snapshotService };
