import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameService } from '../services/GameService.js';
import { SnapshotService } from '../services/SnapshotService.js';
import type { GameState, Player, TeamId, WordStatus } from '../../shared/types/game.js';

interface JoinGameData {
  gameId: string;
  player: Player;
}

interface SelectTeamData {
  gameId: string;
  team: TeamId;
}

interface UpdateSettingsData {
  gameId: string;
  settings: Partial<GameState['settings']>;
}

interface GameIdData {
  gameId: string;
}

interface MarkWordData {
  gameId: string;
  status: WordStatus;
}

interface PlayerQuitData {
  gameId: string;
  confirmed: boolean;
}

interface HostCloseActivityData {
  gameId: string;
  confirmed: boolean;
}

export class SocketHandler {
  constructor(
    private gameService: GameService,
    private snapshotService: SnapshotService
  ) {}

  setupHandlers(io: SocketIOServer): void {
    io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      let currentPlayer: Player | null = null;
      let currentGameId: string | null = null;

      socket.on('join-game', (data: JoinGameData) => {
        const { gameId, player } = data;

        currentPlayer = player;
        currentGameId = gameId;

        // Store player data on socket for broadcast access
        (socket as any).currentPlayer = player;
        (socket as any).currentGameId = gameId;

        socket.join(gameId);

        let game = this.gameService.getGameState(gameId);
        if (!game) {
          game = this.gameService.createGame(gameId, player.id);
          console.log(`✨ New game created! Host: ${player.username} (${player.id})`);
        } else {
          console.log(`📥 Player joining existing game. Host: ${game.host}`);
        }
        game.presence[player.id] = {
          connected: true,
          lastSeen: new Date().toISOString(),
        };

        this.snapshotService.saveSnapshot(game);

        console.log(`👤 Player ${player.username} (${player.id}) joined game ${gameId}`);
        console.log(`🎮 Game state - host: ${game.host}, status: ${game.status}`);

        this.broadcastGameState(io, gameId, game, 'player-joined', { player });
      });

      socket.on('select-team', (data: SelectTeamData) => {
        const { gameId, team } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.joinTeam(gameId, currentPlayer, team);

        if (game) {
          this.broadcastGameState(io, gameId, game, 'game-state');
        }
      });

      socket.on('update-settings', (data: UpdateSettingsData) => {
        const { gameId, settings } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.updateSettings(gameId, currentPlayer.id, settings);

        if (game) {
          this.broadcastGameState(io, gameId, game, 'game-state');
        } else {
          socket.emit('error', { message: 'Тільки хост може змінювати налаштування' });
        }
      });

      socket.on('start-game', (data: GameIdData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.startGame(gameId, currentPlayer.id);

        if (result && 'error' in result) {
          socket.emit('error', { message: result.error });
        } else if (result) {
          // Broadcast countdown state (no timer yet)
          this.broadcastGameState(io, gameId, result, 'round-started');
        } else {
          socket.emit('error', { message: 'Не вдалося почати гру' });
        }
      });

      socket.on('countdown-complete', (data: GameIdData) => {
        const { gameId } = data;

        const game = this.gameService.startPlaying(gameId);

        if (game) {
          // Broadcast playing state and start the timer
          this.broadcastGameState(io, gameId, game, 'game-state');
          this.startRoundTimer(io, gameId);
        }
      });

      socket.on('mark-word', (data: MarkWordData) => {
        const { gameId, status } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.markWord(gameId, currentPlayer.id, status);

        if (result && 'error' in result) {
          socket.emit('error', { message: result.error });
        } else if (result) {
          if (result.status === 'round-end' || result.status === 'finished') {
            this.broadcastGameState(io, gameId, result, 'round-ended');
          } else {
            this.broadcastGameState(io, gameId, result, 'game-state');
          }
        }
      });

      socket.on('end-round-early', (data: GameIdData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.endRound(gameId);

        if (game) {
          this.broadcastGameState(io, gameId, game, 'round-ended');
        }
      });

      socket.on('continue-next-round', (data: GameIdData) => {
        const { gameId } = data;

        const game = this.gameService.continueToNextRound(gameId);

        if (game) {
          // Broadcast countdown state (no timer yet)
          this.broadcastGameState(io, gameId, game, 'round-started');
        }
      });

      socket.on('reset-game', (data: GameIdData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.resetGame(gameId, currentPlayer.id);

        if (game) {
          this.broadcastGameState(io, gameId, game, 'game-state');
        } else {
          socket.emit('error', { message: 'Тільки хост може перезапустити гру' });
        }
      });

      socket.on('create-rematch', (data: GameIdData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.createRematchGame(gameId, currentPlayer.id);

        if (!result) {
          socket.emit('error', { message: 'Не вдалося створити реванш' });
          return;
        }

        const { newGameState, newRoomCode } = result;

        // Notify all players in old room about new room
        io.to(gameId).emit('rematch-created', {
          newGameId: newGameState.gameId,
          newRoomCode: newRoomCode,
          message: `Нова гра створена! Код: ${newRoomCode}`,
        });

        console.log(
          `[Rematch] Game ${gameId} → ${newGameState.gameId} (code: ${newRoomCode})`
        );
      });

      socket.on('request-quit-warnings', (data: GameIdData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const warnings = this.gameService.getQuitWarnings(gameId, currentPlayer.id);
        socket.emit('quit-warnings', { warnings });
      });

      socket.on('player-quit', (data: PlayerQuitData) => {
        const { gameId, confirmed } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const warnings = this.gameService.getQuitWarnings(gameId, currentPlayer.id);

        // Require confirmation if warnings exist
        if (warnings && (warnings.teamBelowMinimum || warnings.isCurrentExplainer) && !confirmed) {
          socket.emit('quit-confirmation-required', { warnings });
          return;
        }

        // Perform the quit
        const game = this.gameService.leaveTeam(gameId, currentPlayer.id);

        if (game) {
          // Update presence
          if (game.presence[currentPlayer.id]) {
            game.presence[currentPlayer.id].connected = false;
            game.presence[currentPlayer.id].lastSeen = new Date().toISOString();
          }

          // Save snapshot
          this.snapshotService.saveSnapshot(game);

          // If explainer quit during round or countdown, end the round early
          if (warnings?.isCurrentExplainer && (game.status === 'countdown' || game.status === 'playing')) {
            const endedGame = this.gameService.endRound(gameId);
            if (endedGame) {
              this.broadcastGameState(io, gameId, endedGame, 'round-ended', { reason: 'explainer-quit' });
            }
          } else {
            // Broadcast updated state
            this.broadcastGameState(io, gameId, game, 'game-state');
          }

          // Notify that player has left
          io.to(gameId).emit('player-quit', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.username,
          });

          // Confirm quit to the player
          socket.emit('quit-confirmed');

          // Leave socket room
          socket.leave(gameId);
          currentGameId = null;
          currentPlayer = null;
        }
      });

      socket.on('host-close-activity', (data: HostCloseActivityData) => {
        const { gameId, confirmed } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.getGameState(gameId);

        if (!game) {
          socket.emit('error', { message: 'Гру не знайдено' });
          return;
        }

        // Verify host permission
        if (game.host !== currentPlayer.id) {
          socket.emit('error', { message: 'Тільки хост може закрити активність' });
          return;
        }

        if (!confirmed) {
          socket.emit('close-activity-confirmation-required');
          return;
        }

        // Broadcast to all players that activity is closing
        io.to(gameId).emit('activity-closed', {
          message: 'Хост закрив гру. Всі гравці будуть відключені.',
        });

        // Give clients a moment to process the event before server cleanup
        setTimeout(() => {
          // Close the game (saves snapshot as finished, removes from RAM)
          this.gameService.closeGame(gameId);

          // Force disconnect all sockets in this room
          const sockets = io.sockets.adapter.rooms.get(gameId);
          if (sockets) {
            sockets.forEach((socketId) => {
              io.sockets.sockets.get(socketId)?.leave(gameId);
            });
          }
        }, 500);
      });

      socket.on('disconnect', () => {
        if (!currentPlayer || !currentGameId) return;

        const game = this.gameService.getGameState(currentGameId);
        if (!game) return;

        if (game.presence[currentPlayer.id]) {
          game.presence[currentPlayer.id].connected = false;
          game.presence[currentPlayer.id].lastSeen = new Date().toISOString();
        }

        this.snapshotService.saveSnapshot(game);
      });
    });
  }

  private sanitizeGameState(game: GameState, playerId: string | null): GameState {
    const sanitized = { ...game };

    if (sanitized.currentRound) {
      const isExplainer = sanitized.currentRound.explainer.id === playerId;

      sanitized.currentRound = { ...sanitized.currentRound };

      if (!isExplainer) {
        sanitized.currentRound.cards = sanitized.currentRound.cards.map((card) => ({
          ...card,
          word: '***',
        }));
      }
    }

    return sanitized;
  }

  private broadcastGameState(io: SocketIOServer, gameId: string, game: GameState, eventName: string, additionalData?: any): void {
    const sockets = io.sockets.adapter.rooms.get(gameId);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) return;

      // Get the player ID for this specific socket
      const playerData = (socket as any).currentPlayer;
      const playerId = playerData?.id || null;

      const sanitizedGame = this.sanitizeGameState(game, playerId);
      socket.emit(eventName, {
        gameState: sanitizedGame,
        ...additionalData,
      });
    });
  }

  private startRoundTimer(io: SocketIOServer, gameId: string): void {
    const game = this.gameService.getGameState(gameId);
    if (!game || !game.currentRound) {
      return;
    }

    const intervalId = setInterval(() => {
      const currentGame = this.gameService.getGameState(gameId);

      if (!currentGame || !currentGame.currentRound || currentGame.status !== 'playing') {
        clearInterval(intervalId);
        return;
      }

      const elapsed = Math.floor((Date.now() - currentGame.currentRound.startTime) / 1000);
      const timeRemaining = currentGame.settings.roundTime - elapsed;

      currentGame.currentRound.timeRemaining = Math.max(0, timeRemaining);

      io.to(gameId).emit('timer-update', {
        timeRemaining: currentGame.currentRound.timeRemaining,
      });

      if (currentGame.currentRound.timeRemaining <= 0) {
        clearInterval(intervalId);

        const endedGame = this.gameService.endRound(gameId);
        if (endedGame) {
          this.broadcastGameState(io, gameId, endedGame, 'round-ended');
        }
      }
    }, 1000);
  }
}
