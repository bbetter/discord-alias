import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GameState } from '../../shared/types/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SnapshotService {
  private liveDir: string;
  private archiveDir: string;

  constructor(liveDir?: string) {
    // Use absolute path from project root to avoid issues with working directory
    if (!liveDir) {
      // Default to project_root/sessions/live
      // From server/services/ -> go up 2 levels to project root
      this.liveDir = path.join(__dirname, '../..', 'sessions', 'live');
      this.archiveDir = path.join(__dirname, '../..', 'sessions', 'archive');
    } else {
      this.liveDir = path.resolve(liveDir);
      this.archiveDir = path.resolve(path.dirname(liveDir), 'archive');
    }
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.liveDir, { recursive: true });
  }

  async saveSnapshot(game: GameState): Promise<void> {
    // Ensure directory exists before any file operations
    await this.ensureDir();

    const tmp = path.join(this.liveDir, `${game.gameId}.json.tmp`);
    const file = path.join(this.liveDir, `${game.gameId}.json`);

    const payload = {
      ...game,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Write to temp file
      await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');

      // Verify temp file was created before attempting rename
      try {
        await fs.access(tmp);
      } catch {
        throw new Error('Temp file was not created successfully');
      }

      // Atomic rename
      await fs.rename(tmp, file);
    } catch (error) {
      const err = error as Error;
      console.error(`[SnapshotService] Atomic save failed for ${game.gameId}:`, err.message);
      console.error(`[SnapshotService] Live directory: ${this.liveDir}`);

      // Clean up temp file if it exists
      try {
        await fs.rm(tmp, { force: true });
      } catch {
        // Ignore cleanup errors
      }

      // Write directly to final file
      try {
        // Ensure directory still exists
        await this.ensureDir();
        await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
      } catch (writeError) {
        console.error('[SnapshotService] Failed to write snapshot file:', writeError);
        throw writeError;
      }
    }
  }

  async deleteSnapshot(gameId: string): Promise<void> {
    const file = path.join(this.liveDir, `${gameId}.json`);
    await fs.rm(file, { force: true });
  }

  async loadSnapshots(): Promise<GameState[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.liveDir);

    const snapshots: GameState[] = [];
    for (const f of files) {
      if (f.endsWith('.tmp') || !f.endsWith('.json')) {
        continue;
      }

      const raw = await fs.readFile(path.join(this.liveDir, f), 'utf8');
      snapshots.push(JSON.parse(raw) as GameState);
    }
    return snapshots;
  }

  async loadSnapshotById(gameId: string): Promise<GameState | null> {
    const file = path.join(this.liveDir, `${gameId}.json`);
    try {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }

  async archiveSnapshot(gameId: string): Promise<void> {
    await fs.mkdir(this.archiveDir, { recursive: true });

    const sourceFile = path.join(this.liveDir, `${gameId}.json`);
    const archiveFile = path.join(this.archiveDir, `${gameId}.json`);

    try {
      const data = await fs.readFile(sourceFile, 'utf8');
      await fs.writeFile(archiveFile, data, 'utf8');
      console.log(`[SnapshotService] Archived game ${gameId}`);
    } catch (error) {
      console.error(`[SnapshotService] Failed to archive ${gameId}:`, error);
    }
  }

  async loadArchivedSnapshots(): Promise<GameState[]> {
    await fs.mkdir(this.archiveDir, { recursive: true });

    try {
      const files = await fs.readdir(this.archiveDir);
      const snapshots: GameState[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(this.archiveDir, file), 'utf8');
          snapshots.push(JSON.parse(data) as GameState);
        }
      }

      return snapshots;
    } catch (error) {
      console.error('[SnapshotService] Failed to load archived snapshots:', error);
      return [];
    }
  }
}
