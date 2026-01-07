import * as gameManager from './game-manager.js';
import { saveSnapshot } from './snapshot-manager.js';

/**
 * Setup Socket.IO event handlers
 * @param {object} io - Socket.IO server instance
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Store player info on socket
    let currentPlayer = null;
    let currentGameId = null;

    /**
     * Join game
     */
    socket.on('join-game', (data) => {
      const { gameId, player } = data;

      // Debug: log incoming join attempts (player ID + socket)
      console.log(`join-game: player ${player.username} (${player.id}), socket ${socket.id}`);

      currentPlayer = player;
      currentGameId = gameId;

      // Join socket room
      socket.join(gameId);

      // Create game if it doesn't exist
      let game = gameManager.getGameState(gameId);
      if (!game) {
        game = gameManager.createGame(gameId, player.id);
        console.log(`✨ New game created! Host: ${player.username} (${player.id})`);
      } else {
        console.log(`📥 Player joining existing game. Host: ${game.host}`);
      }
      // Initialize presence for the player if needed and track per-socket connections
      if (!game.presence[player.id]) {
        game.presence[player.id] = {
          connected: true,
          lastSeen: new Date().toISOString(),
          connections: {}, // map of socketId -> true
        };
      }

      // Record this socket connection
      game.presence[player.id].connections[socket.id] = true;
      game.presence[player.id].connected = true;
      game.presence[player.id].lastSeen = new Date().toISOString();

      saveSnapshot(game);

      console.log(`👤 Player ${player.username} (${player.id}) joined game ${gameId}`);
      console.log(`🎮 Game state - host: ${game.host}, status: ${game.status}`);

      // Broadcast player joined
      io.to(gameId).emit('player-joined', {
        player,
        gameState: sanitizeGameState(game, player.id),
      });
    });

    /**
     * Select team
     */
    socket.on('select-team', (data) => {
      const { gameId, team } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      console.log(`select-team: player ${currentPlayer.username} (${currentPlayer.id}) -> ${team} (socket ${socket.id})`);

      const game = gameManager.joinTeam(gameId, currentPlayer, team);

      if (game) {
        console.log(`Teams after join: teamA=${game.teams.teamA.players.length}, teamB=${game.teams.teamB.players.length}`);
        console.log('teamA players:', game.teams.teamA.players.map(p => `${p.username}(${p.id})`).join(', '));
        console.log('teamB players:', game.teams.teamB.players.map(p => `${p.username}(${p.id})`).join(', '));

        // Broadcast updated state
        io.to(gameId).emit('game-state', {
          gameState: sanitizeGameState(game, currentPlayer.id),
        });

        // Also emit player-joined to help clients that listen for this event
        io.to(gameId).emit('player-joined', {
          player: currentPlayer,
          gameState: sanitizeGameState(game, currentPlayer.id),
        });
      }
    });

    /**
     * Update settings (host only)
     */
    socket.on('update-settings', (data) => {
      const { gameId, settings } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      const game = gameManager.updateSettings(gameId, currentPlayer.id, settings);

      if (game) {
        io.to(gameId).emit('game-state', {
          gameState: sanitizeGameState(game, currentPlayer.id),
        });
      } else {
        socket.emit('error', { message: 'Тільки хост може змінювати налаштування' });
      }
    });

    /**
     * Start game (host only)
     */
    socket.on('start-game', (data) => {
      const { gameId } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      const result = gameManager.startGame(gameId, currentPlayer.id);

      if (result && result.error) {
        socket.emit('error', { message: result.error });
      } else if (result) {
        // Broadcast round started
        io.to(gameId).emit('round-started', {
          gameState: sanitizeGameState(result, currentPlayer.id),
        });

        // Start timer
        startRoundTimer(io, gameId);
      } else {
        socket.emit('error', { message: 'Не вдалося почати гру' });
      }
    });

    /**
     * Mark word (explainer only)
     */
    socket.on('mark-word', (data) => {
      const { gameId, status } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      const result = gameManager.markWord(gameId, currentPlayer.id, status);

      if (result && result.error) {
        socket.emit('error', { message: result.error });
      } else if (result) {
        // Check if round ended
        if (result.status === 'round-end' || result.status === 'finished') {
          io.to(gameId).emit('round-ended', {
            gameState: sanitizeGameState(result, currentPlayer.id),
          });
        } else {
          // Broadcast updated state
          io.to(gameId).emit('game-state', {
            gameState: sanitizeGameState(result, currentPlayer.id),
          });
        }
      }
    });

    /**
     * End round early (explainer only)
     */
    socket.on('end-round-early', (data) => {
      const { gameId } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      const game = gameManager.endRound(gameId);

      if (game) {
        io.to(gameId).emit('round-ended', {
          gameState: sanitizeGameState(game, currentPlayer.id),
        });
      }
    });

    /**
     * Continue to next round
     */
    socket.on('continue-next-round', (data) => {
      const { gameId } = data;

      const game = gameManager.continueToNextRound(gameId);

      if (game) {
        io.to(gameId).emit('round-started', {
          gameState: sanitizeGameState(game, currentPlayer.id),
        });

        // Start timer for new round
        startRoundTimer(io, gameId);
      }
    });

    /**
     * Reset game (play again)
     */
    socket.on('reset-game', (data) => {
      const { gameId } = data;

      if (!currentPlayer) {
        socket.emit('error', { message: 'Не авторизовано' });
        return;
      }

      const game = gameManager.resetGame(gameId, currentPlayer.id);

      if (game) {
        io.to(gameId).emit('game-state', {
          gameState: sanitizeGameState(game, currentPlayer.id),
        });
      } else {
        socket.emit('error', { message: 'Тільки хост може перезапустити гру' });
      }
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      if (!currentPlayer || !currentGameId) return;

      const game = gameManager.getGameState(currentGameId);
      if (!game) return;

      const p = game.presence[currentPlayer.id];
      if (p) {
        // Remove this socket connection
        if (p.connections && p.connections[socket.id]) {
          delete p.connections[socket.id];
        }

        // If no remaining connections, mark as disconnected
        const remaining = Object.keys(p.connections || {}).length;
        if (remaining === 0) {
          p.connected = false;
          p.lastSeen = new Date().toISOString();
        }
      }

      saveSnapshot(game);
    });
  });
}

/**
 * Sanitize game state before sending to client
 * Hides word cards from non-explainers
 * @param {object} game - Game state
 * @param {string} playerId - Current player ID
 * @returns {object} - Sanitized game state
 */
function sanitizeGameState(game, playerId) {
  const sanitized = { ...game };

  // If there's a current round, sanitize the cards
  if (sanitized.currentRound) {
    const isExplainer = sanitized.currentRound.explainer.id === playerId;

    sanitized.currentRound = { ...sanitized.currentRound };

    if (!isExplainer) {
      // Non-explainers shouldn't see the words
      sanitized.currentRound.cards = sanitized.currentRound.cards.map((card) => ({
        ...card,
        word: '***', // Hidden
      }));
    }
  }

  return sanitized;
}

/**
 * Start round timer
 * @param {object} io - Socket.IO server instance
 * @param {string} gameId - Game ID
 */
function startRoundTimer(io, gameId) {
  const game = gameManager.getGameState(gameId);
  if (!game || !game.currentRound) {
    return;
  }

  const intervalId = setInterval(() => {
    const currentGame = gameManager.getGameState(gameId);

    if (!currentGame || !currentGame.currentRound || currentGame.status !== 'playing') {
      clearInterval(intervalId);
      return;
    }

    // Calculate time remaining
    const elapsed = Math.floor((Date.now() - currentGame.currentRound.startTime) / 1000);
    const timeRemaining = currentGame.settings.roundTime - elapsed;

    currentGame.currentRound.timeRemaining = Math.max(0, timeRemaining);

    // Broadcast timer update
    io.to(gameId).emit('timer-update', {
      timeRemaining: currentGame.currentRound.timeRemaining,
    });

    // End round when time is up
    if (currentGame.currentRound.timeRemaining <= 0) {
      clearInterval(intervalId);

      const endedGame = gameManager.endRound(gameId);
      if (endedGame) {
        io.to(gameId).emit('round-ended', {
          gameState: sanitizeGameState(endedGame, null),
        });
      }
    }
  }, 1000);
}
