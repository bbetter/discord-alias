import express, { Request, Response } from 'express';
import multer from 'multer';
import { gameService, snapshotService } from '../index.js';
import { WordPackService } from '../services/WordPackService.js';
import { reloadWordBank } from '../word-loader.js';
import type { WordPack } from '../../shared/types/wordpack.js';

const router = express.Router();
const wordPackService = new WordPackService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.wordspack')) {
      cb(null, true);
    } else {
      cb(new Error('Only .wordspack (JSON) files are allowed'));
    }
  },
});

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

// ===== Word Pack Management =====

// List all word packs
router.get('/wordpacks', (_req: Request, res: Response) => {
  const wordPacks = wordPackService.listWordPacks();
  res.json(wordPacks);
});

// Get specific word pack
router.get('/wordpacks/:id', (req: Request, res: Response) => {
  const wordPack = wordPackService.getWordPack(req.params.id);
  if (!wordPack) {
    return res.status(404).json({ error: 'Word pack not found' });
  }
  res.json(wordPack);
});

// Create or update word pack
router.put('/wordpacks/:id', (req: Request, res: Response) => {
  const wordPack = req.body as WordPack;

  // Validate word pack
  const validation = wordPackService.validateWordPack(wordPack);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid word pack',
      details: validation.errors
    });
  }

  const success = wordPackService.saveWordPack(req.params.id, wordPack);
  if (!success) {
    return res.status(500).json({ error: 'Failed to save word pack' });
  }

  // Reload word bank to pick up changes
  reloadWordBank();

  res.json({ success: true, message: 'Word pack saved' });
});

// Upload word pack file
router.post('/wordpacks/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const content = req.file.buffer.toString('utf-8');
    const wordPack = JSON.parse(content) as WordPack;

    // Validate word pack
    const validation = wordPackService.validateWordPack(wordPack);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid word pack',
        details: validation.errors
      });
    }

    // Generate ID from filename or category
    const originalName = req.file.originalname.replace('.wordspack', '');
    const id = originalName || wordPack.metadata.category || `pack-${Date.now()}`;

    const success = wordPackService.saveWordPack(id, wordPack);
    if (!success) {
      return res.status(500).json({ error: 'Failed to save word pack' });
    }

    // Reload word bank to pick up new word pack
    reloadWordBank();

    res.json({
      success: true,
      message: 'Word pack uploaded',
      id,
      wordCount: wordPack.words.length
    });
  } catch (error) {
    res.status(400).json({
      error: 'Invalid JSON file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete word pack
router.delete('/wordpacks/:id', (req: Request, res: Response) => {
  const success = wordPackService.deleteWordPack(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Word pack not found' });
  }

  // Reload word bank to remove deleted pack
  reloadWordBank();

  res.json({ success: true, message: 'Word pack deleted' });
});

// Export word pack to .txt format
router.get('/wordpacks/:id/export-txt', (req: Request, res: Response) => {
  const txt = wordPackService.exportToTxt(req.params.id);
  if (!txt) {
    return res.status(404).json({ error: 'Word pack not found' });
  }

  const wordPack = wordPackService.getWordPack(req.params.id);
  const filename = `${wordPack?.metadata.name || req.params.id}.txt`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(txt);
});

export default router;
