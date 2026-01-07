import express, { Request, Response } from 'express';
import { gameService, snapshotService } from '../index.js';

const router = express.Router();

// Live games (RAM)
router.get('/live/games', (_req: Request, res: Response) => {
  res.json(gameService.getAllGamesSummary());
});

// Live game by id
router.get('/live/games/:gameId', (req: Request, res: Response) => {
  const game = gameService.getGameState(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

// Snapshots list
router.get('/history', async (_req: Request, res: Response) => {
  const snapshots = await snapshotService.loadSnapshots();
  res.json(snapshots);
});

// Snapshot details
router.get('/history/:gameId', async (req: Request, res: Response) => {
  const snapshot = await snapshotService.loadSnapshotById(req.params.gameId);
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }
  res.json(snapshot);
});

// Delete snapshot
router.delete('/history/:gameId', async (req: Request, res: Response) => {
  try {
    await snapshotService.deleteSnapshot(req.params.gameId);
    res.json({ success: true, message: 'Snapshot deleted' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete snapshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Cleanup empty lobbies (RAM only)
router.post('/cleanup/empty-lobbies', (_req: Request, res: Response) => {
  const removedGames = gameService.cleanupEmptyLobbies();

  res.json({
    removedGames,
  });
});

export default router;
