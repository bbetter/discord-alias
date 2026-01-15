import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameService } from '../services/GameService.js';
import { SnapshotService } from '../services/SnapshotService.js';
import { sessionLoggerService } from '../services/SessionLoggerService.js';
import { createLogger } from '../utils/logger.js';
import { getCategories } from '../word-loader.js';
import type { GameState, Player, TeamId, WordStatus } from '../../shared/types/game.js';

const serverLogger = createLogger('SOCKET');

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

interface InitiateDisputeData {
  gameId: string;
  roundNumber: number;
  wordIndex: number;
  proposedStatus: WordStatus;
  reason: string;
}

interface CastDisputeVoteData {
  gameId: string;
  vote: 'agree' | 'disagree';
}

interface CancelDisputeData {
  gameId: string;
}

export class SocketHandler {
  constructor(
    private gameService: GameService,
    private snapshotService: SnapshotService
  ) {}

  setupHandlers(io: SocketIOServer): void {
    io.on('connection', (socket: Socket) => {
      serverLogger.info({
        tag: 'SOCKET',
        socketId: socket.id,
        action: 'client_connected',
      }, '[SOCKET] Client connected');

      let currentPlayer: Player | null = null;
      let currentGameId: string | null = null;

      // Get available categories
      socket.on('get-categories', () => {
        try {
          const categories = getCategories();
          socket.emit('categories', categories);
        } catch (error) {
          serverLogger.error({
            tag: 'ERROR',
            socketId: socket.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'get_categories_error',
          }, '[ERROR] Error getting categories');
          socket.emit('categories', ['змішані', 'різне']); // Fallback
        }
      });

      socket.on('join-game', (data: JoinGameData) => {
        const { gameId, player } = data;

        currentPlayer = player;
        currentGameId = gameId;

        // Store player data on socket for broadcast access
        (socket as any).currentPlayer = player;
        (socket as any).currentGameId = gameId;

        socket.join(gameId);

        let game = this.gameService.getGameState(gameId);
        const logger = sessionLoggerService.getLogger(gameId);

        if (!game) {
          game = this.gameService.createGame(gameId, player.id);
        }

        game.presence[player.id] = {
          connected: true,
          lastSeen: new Date().toISOString(),
        };

        this.snapshotService.saveSnapshot(game);

        if (logger) {
          logger.info({
            tag: 'PLAYER',
            gameId,
            playerId: player.id,
            username: player.username,
            socketId: socket.id,
            isHost: game.host === player.id,
            action: 'player_joined',
          }, `[PLAYER] ${player.username} joined game`);
        }

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

      socket.on('rename-team', (data: { gameId: string; teamId: TeamId; newName: string }) => {
        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.renameTeam(data.gameId, currentPlayer.id, data.teamId, data.newName);

        if (game) {
          this.broadcastGameState(io, data.gameId, game, 'game-state');
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
          if (result.status === 'last-word-steal') {
            this.broadcastGameState(io, gameId, result, 'last-word-steal-started');
            this.startLastWordStealTimer(io, gameId);
          } else if (result.status === 'round-end' || result.status === 'finished') {
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
          if (game.status === 'last-word-steal') {
            this.broadcastGameState(io, gameId, game, 'last-word-steal-started');
            this.startLastWordStealTimer(io, gameId);
          } else {
            this.broadcastGameState(io, gameId, game, 'round-ended');
          }
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
          const logger = sessionLoggerService.getLogger(gameId);

          // Update presence
          if (game.presence[currentPlayer.id]) {
            game.presence[currentPlayer.id].connected = false;
            game.presence[currentPlayer.id].lastSeen = new Date().toISOString();
          }

          // Save snapshot
          this.snapshotService.saveSnapshot(game);

          if (logger) {
            logger.info({
              tag: 'PLAYER',
              gameId,
              playerId: currentPlayer.id,
              username: currentPlayer.username,
              wasExplainer: warnings?.isCurrentExplainer || false,
              teamBelowMinimum: warnings?.teamBelowMinimum || false,
              action: 'player_quit',
            }, `[PLAYER] ${currentPlayer.username} quit the game`);
          }

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

      socket.on('initiate-dispute', (data: InitiateDisputeData) => {
        const { gameId, roundNumber, wordIndex, proposedStatus, reason } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.initiateDispute(
          gameId,
          currentPlayer.id,
          roundNumber,
          wordIndex,
          proposedStatus,
          reason
        );

        if (result && 'error' in result) {
          socket.emit('dispute-error', { message: result.error });
        } else if (result) {
          this.broadcastGameState(io, gameId, result, 'dispute-started');
        }
      });

      socket.on('cast-dispute-vote', (data: CastDisputeVoteData) => {
        const { gameId, vote } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.castDisputeVote(gameId, currentPlayer.id, vote);

        if (result && 'error' in result) {
          socket.emit('dispute-error', { message: result.error });
        } else if (result) {
          // Check if dispute was resolved (status changed back to round-end)
          const eventName = result.status === 'round-end' || result.status === 'finished' ? 'dispute-resolved' : 'dispute-vote-recorded';
          this.broadcastGameState(io, gameId, result, eventName);
        }
      });

      socket.on('cancel-dispute', (data: CancelDisputeData) => {
        const { gameId } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const result = this.gameService.cancelDispute(gameId, currentPlayer.id);

        if (result && 'error' in result) {
          socket.emit('dispute-error', { message: result.error });
        } else if (result) {
          this.broadcastGameState(io, gameId, result, 'dispute-resolved');
        }
      });

      socket.on('mark-steal-word', (data: { gameId: string; success: boolean }) => {
        const { gameId, success } = data;

        if (!currentPlayer) {
          socket.emit('error', { message: 'Не авторизовано' });
          return;
        }

        const game = this.gameService.markStealWord(gameId, currentPlayer.id, success);

        if (game) {
          this.broadcastGameState(io, gameId, game, 'round-ended');
        } else {
          socket.emit('error', { message: 'Не вдалося відмітити слово' });
        }
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

        const logger = sessionLoggerService.getLogger(currentGameId);
        if (logger) {
          logger.info({
            tag: 'SOCKET',
            gameId: currentGameId,
            playerId: currentPlayer.id,
            username: currentPlayer.username,
            socketId: socket.id,
            action: 'client_disconnected',
          }, `[SOCKET] ${currentPlayer.username} disconnected`);
        }
      });
    });
  }

  private sanitizeGameState(game: GameState, playerId: string | null): GameState {
    const sanitized = { ...game };

    if (sanitized.currentRound) {
      const isExplainer = sanitized.currentRound.explainer.id === playerId;

      // Determine if player is on the current team
      const currentTeam = sanitized.teams[sanitized.currentRound.team];
      const isOnCurrentTeam = currentTeam.players.some(p => p.id === playerId);
      const isOpponent = !isOnCurrentTeam;

      sanitized.currentRound = { ...sanitized.currentRound };

      // Hide words based on game mode and player role:
      // - Explainer always sees words
      // - Team members (non-explainers) never see words
      // - In "simple" mode: opponents see words
      // - In "steal" mode: opponents don't see words
      const shouldHideWords = !isExplainer &&
        (isOnCurrentTeam || sanitized.settings.gameMode === 'steal');

      if (shouldHideWords) {
        sanitized.currentRound.cards = sanitized.currentRound.cards.map((card) => ({
          ...card,
          word: '***',
        }));
      }
    }

    // Hide last word steal word from everyone except the original explainer
    // The original explainer is the one who was explaining when time ran out
    if (sanitized.lastWordSteal && sanitized.currentRound) {
      const isOriginalExplainer = sanitized.currentRound.explainer.id === playerId;

      if (!isOriginalExplainer) {
        sanitized.lastWordSteal = {
          ...sanitized.lastWordSteal,
          word: '***',
        };
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
          if (endedGame.status === 'pre-steal-countdown') {
            this.broadcastGameState(io, gameId, endedGame, 'pre-steal-countdown-started');
            this.startPreStealCountdownTimer(io, gameId);
          } else {
            this.broadcastGameState(io, gameId, endedGame, 'round-ended');
          }
        }
      }
    }, 1000);
  }

  private startPreStealCountdownTimer(io: SocketIOServer, gameId: string): void {
    const game = this.gameService.getGameState(gameId);
    if (!game || !game.lastWordSteal) {
      return;
    }

    const startTime = Date.now();
    const countdownDuration = 5; // 5 seconds countdown

    const intervalId = setInterval(() => {
      const currentGame = this.gameService.getGameState(gameId);

      if (!currentGame || !currentGame.lastWordSteal || currentGame.status !== 'pre-steal-countdown') {
        clearInterval(intervalId);
        return;
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeRemaining = countdownDuration - elapsed;

      currentGame.lastWordSteal.preStealCountdown = Math.max(0, timeRemaining);

      io.to(gameId).emit('pre-steal-countdown-update', {
        timeRemaining: currentGame.lastWordSteal.preStealCountdown,
      });

      if (currentGame.lastWordSteal.preStealCountdown <= 0) {
        clearInterval(intervalId);

        // Transition to last word steal
        const stealGame = this.gameService.startLastWordSteal(gameId);
        if (stealGame) {
          this.broadcastGameState(io, gameId, stealGame, 'last-word-steal-started');
          this.startLastWordStealTimer(io, gameId);
        }
      }
    }, 1000);
  }

  private startLastWordStealTimer(io: SocketIOServer, gameId: string): void {
    const game = this.gameService.getGameState(gameId);
    if (!game || !game.lastWordSteal) {
      return;
    }

    const intervalId = setInterval(() => {
      const currentGame = this.gameService.getGameState(gameId);

      if (!currentGame || !currentGame.lastWordSteal || currentGame.status !== 'last-word-steal') {
        clearInterval(intervalId);
        return;
      }

      const elapsed = Math.floor((Date.now() - currentGame.lastWordSteal.startTime) / 1000);
      const timeRemaining = 15 - elapsed;

      currentGame.lastWordSteal.timeRemaining = Math.max(0, timeRemaining);

      io.to(gameId).emit('steal-timer-update', {
        timeRemaining: currentGame.lastWordSteal.timeRemaining,
      });

      if (currentGame.lastWordSteal.timeRemaining <= 0) {
        clearInterval(intervalId);

        const endedGame = this.gameService.endLastWordSteal(gameId);
        if (endedGame) {
          this.broadcastGameState(io, gameId, endedGame, 'round-ended');
        }
      }
    }, 1000);
  }
}
