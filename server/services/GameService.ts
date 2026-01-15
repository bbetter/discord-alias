import { getRandomWords } from '../word-loader.js';
import { SnapshotService } from './SnapshotService.js';
import { sessionLoggerService } from './SessionLoggerService.js';
import type {
  GameState,
  GameSettings,
  Player,
  TeamId,
  WordStatus,
  GameSummary,
  QuitWarnings,
  DisputeInfo,
} from '../../shared/types/game.js';

interface GameError {
  error: string;
}

type GameResult = GameState | GameError;

export class GameService {
  private games = new Map<string, GameState>();
  private snapshotService: SnapshotService;

  constructor(snapshotService: SnapshotService) {
    this.snapshotService = snapshotService;
  }

  createGame(instanceId: string, hostId: string): GameState {
    // Start session logging for this game
    const logger = sessionLoggerService.startSession(instanceId);

    const gameState: GameState = {
      gameId: instanceId,
      status: 'lobby',
      host: hostId,
      createdAt: new Date().toISOString(),
      settings: {
        roundTime: 60,
        category: 'змішані',
        difficulty: 'змішані',
        pointsToWin: 30,
        wordsPerRound: 20,
        skipPenalty: 0,
        gameMode: 'simple',
        lastWordStealEnabled: false,
      },
      teams: {
        teamA: {
          name: 'Команда А',
          players: [],
          score: 0,
        },
        teamB: {
          name: 'Команда Б',
          players: [],
          score: 0,
        },
      },
      presence: {},
      currentRound: null,
      lastWordSteal: null,
      history: [],
      roundNumber: 0,
      teamARounds: 0,
      teamBRounds: 0,
      currentTeam: 'teamA',
      currentDispute: null,
      disputeQueue: [],
      disputeHistory: [],
      usedWords: [],
    };

    this.games.set(instanceId, gameState);
    this.snapshotService.saveSnapshot(gameState);

    logger.info({
      tag: 'GAME',
      gameId: instanceId,
      hostId,
      action: 'game_created',
    }, '[GAME] Game created');

    return gameState;
  }

  getGameState(gameId: string): GameState | null {
    return this.games.get(gameId) || null;
  }

  joinTeam(gameId: string, player: Player, team: TeamId): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'lobby') {
      return null;
    }

    // Remove player from both teams first
    game.teams.teamA.players = game.teams.teamA.players.filter((p) => p.id !== player.id);
    game.teams.teamB.players = game.teams.teamB.players.filter((p) => p.id !== player.id);

    // Add to selected team
    game.teams[team].players.push(player);

    this.snapshotService.saveSnapshot(game);

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.info({
        tag: 'PLAYER',
        gameId,
        playerId: player.id,
        team,
        teamName: game.teams[team].name,
        action: 'team_changed',
      }, `[PLAYER] ${player.username} joined ${game.teams[team].name}`);
    }

    return game;
  }

  leaveTeam(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    game.teams.teamA.players = game.teams.teamA.players.filter((p) => p.id !== playerId);
    game.teams.teamB.players = game.teams.teamB.players.filter((p) => p.id !== playerId);

    return game;
  }

  renameTeam(gameId: string, playerId: string, teamId: TeamId, newName: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'lobby' || game.host !== playerId) {
      return null;
    }

    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length > 30) {
      return null;
    }

    game.teams[teamId].name = trimmedName;
    this.snapshotService.saveSnapshot(game);
    return game;
  }

  getQuitWarnings(gameId: string, playerId: string): QuitWarnings | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    // Find which team the player is on
    let teamId: TeamId | null = null;
    let teamSize = 0;

    if (game.teams.teamA.players.some((p) => p.id === playerId)) {
      teamId = 'teamA';
      teamSize = game.teams.teamA.players.length;
    } else if (game.teams.teamB.players.some((p) => p.id === playerId)) {
      teamId = 'teamB';
      teamSize = game.teams.teamB.players.length;
    }

    // Check if they're the current explainer during active play
    const isCurrentExplainer =
      game.currentRound?.explainer.id === playerId &&
      (game.status === 'countdown' || game.status === 'playing');

    // Check if leaving would drop team below minimum (2 players)
    const teamBelowMinimum = teamId !== null && teamSize - 1 < 2;

    return {
      teamBelowMinimum,
      isCurrentExplainer,
      teamId,
      teamSize,
    };
  }

  updateSettings(
    gameId: string,
    playerId: string,
    settings: Partial<GameSettings>
  ): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.host !== playerId || game.status !== 'lobby') {
      return null;
    }

    if (settings.roundTime !== undefined) {
      game.settings.roundTime = settings.roundTime;
    }
    if (settings.category !== undefined) {
      game.settings.category = settings.category;
    }
    if (settings.difficulty !== undefined) {
      game.settings.difficulty = settings.difficulty;
    }
    if (settings.pointsToWin !== undefined) {
      game.settings.pointsToWin = settings.pointsToWin;
    }
    if (settings.skipPenalty !== undefined) {
      game.settings.skipPenalty = settings.skipPenalty;
    }
    if (settings.gameMode !== undefined) {
      game.settings.gameMode = settings.gameMode;
      // Keep lastWordStealEnabled in sync with gameMode
      game.settings.lastWordStealEnabled = settings.gameMode === 'steal';
    }
    if (settings.lastWordStealEnabled !== undefined) {
      game.settings.lastWordStealEnabled = settings.lastWordStealEnabled;
      // Sync gameMode when lastWordStealEnabled is updated directly (for backward compatibility)
      game.settings.gameMode = settings.lastWordStealEnabled ? 'steal' : 'simple';
    }

    this.snapshotService.saveSnapshot(game);

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.info({
        tag: 'GAME',
        gameId,
        playerId,
        settings,
        action: 'settings_updated',
      }, '[GAME] Settings updated');
    }

    return game;
  }

  startGame(gameId: string, playerId: string): GameResult | null {
    const game = this.games.get(gameId);
    if (!game || game.host !== playerId || game.status !== 'lobby') {
      return null;
    }

    if (game.teams.teamA.players.length < 2 || game.teams.teamB.players.length < 2) {
      return { error: 'Кожна команда повинна мати принаймні 2 гравці' };
    }

    game.startedAt = new Date().toISOString();
    game.roundNumber = 0;
    game.teamARounds = 0;
    game.teamBRounds = 0;
    game.currentTeam = 'teamA';

    this.snapshotService.saveSnapshot(game);

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.info({
        tag: 'GAME',
        gameId,
        playerId,
        teamAPlayers: game.teams.teamA.players.map(p => p.username),
        teamBPlayers: game.teams.teamB.players.map(p => p.username),
        action: 'game_started',
      }, '[GAME] Game started');
    }

    return this.startRound(gameId);
  }

  startRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    game.roundNumber++;

    // Increment the current team's round counter
    if (game.currentTeam === 'teamA') {
      game.teamARounds++;
    } else {
      game.teamBRounds++;
    }

    const team = game.teams[game.currentTeam];
    const teamRoundCount = game.currentTeam === 'teamA' ? game.teamARounds : game.teamBRounds;
    const explainerIndex = (teamRoundCount - 1) % team.players.length;
    const explainer = team.players[explainerIndex];

    const cards = getRandomWords(
      game.settings.category,
      game.settings.difficulty,
      game.settings.wordsPerRound,
      game.usedWords
    ).map((wordObj) => ({
      word: wordObj.word,
      difficulty: wordObj.difficulty,
      status: 'pending' as WordStatus,
    }));

    // Add new words to usedWords to prevent duplicates
    const newWords = cards.map((card) => card.word);
    game.usedWords.push(...newWords);

    game.currentRound = {
      team: game.currentTeam,
      explainer: explainer,
      wordIndex: 0,
      cards: cards,
      startTime: Date.now(),
      timeRemaining: game.settings.roundTime,
      correctCount: 0,
      skippedCount: 0,
    };

    game.status = 'countdown';

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.info({
        tag: 'ROUND',
        gameId,
        roundNumber: game.roundNumber,
        team: game.currentTeam,
        teamName: team.name,
        explainerId: explainer.id,
        explainerName: explainer.username,
        wordCount: cards.length,
        action: 'round_started',
      }, `[ROUND] Round ${game.roundNumber} started - ${team.name}, explainer: ${explainer.username}`);
    }

    return game;
  }

  startPlaying(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'countdown') {
      return null;
    }

    game.status = 'playing';

    // Reset the start time to now (since countdown took some time)
    if (game.currentRound) {
      game.currentRound.startTime = Date.now();
    }

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  markWord(gameId: string, playerId: string, status: WordStatus): GameResult | null {
    const game = this.games.get(gameId);
    if (!game || !game.currentRound || game.status !== 'playing') {
      return null;
    }

    if (game.currentRound.explainer.id !== playerId) {
      return { error: 'Тільки пояснювач може позначити слово' };
    }

    const currentIndex = game.currentRound.wordIndex;
    const currentCard = game.currentRound.cards[currentIndex];

    if (!currentCard) {
      return { error: 'Немає поточного слова' };
    }

    currentCard.status = status;

    if (status === 'correct') {
      game.currentRound.correctCount++;
    } else if (status === 'skipped') {
      game.currentRound.skippedCount++;
    }

    game.currentRound.wordIndex++;

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.debug({
        tag: 'ROUND',
        gameId,
        playerId,
        word: currentCard.word,
        status,
        wordIndex: game.currentRound.wordIndex,
        totalCards: game.currentRound.cards.length,
        action: 'word_marked',
      }, `[ROUND] Word marked: ${currentCard.word} - ${status}`);
    }

    if (game.currentRound.wordIndex >= game.currentRound.cards.length) {
      return this.endRound(gameId);
    }

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  endRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || !game.currentRound) {
      return null;
    }

    // Check for last word steal scenario
    if (game.settings.lastWordStealEnabled) {
      const lastCard = game.currentRound.cards[game.currentRound.cards.length - 1];
      if (lastCard && lastCard.status === 'pending') {
        // Initiate pre-steal countdown (5 seconds for opponent team to get ready)
        const stealingTeam = game.currentRound.team === 'teamA' ? 'teamB' : 'teamA';
        game.lastWordSteal = {
          word: lastCard.word,
          difficulty: lastCard.difficulty,
          stealingTeam: stealingTeam,
          startTime: Date.now(),
          timeRemaining: 15,
          originalTeam: game.currentRound.team,
          preStealCountdown: 5,
        };
        game.status = 'pre-steal-countdown';
        this.snapshotService.saveSnapshot(game);
        return game;
      }
    }

    // Calculate points with skip penalty
    const correctPoints = game.currentRound.correctCount;
    const skipPenalty = game.currentRound.skippedCount * game.settings.skipPenalty;
    const points = correctPoints + skipPenalty;

    // Calculate round duration
    const roundStartTime = game.currentRound.startTime;
    const roundEndTime = Date.now();
    const durationSeconds = Math.floor((roundEndTime - roundStartTime) / 1000);

    game.teams[game.currentRound.team].score += points;

    game.history.push({
      roundNumber: game.roundNumber,
      team: game.currentRound.team,
      explainer: game.currentRound.explainer,
      cards: game.currentRound.cards,
      correctCount: game.currentRound.correctCount,
      skippedCount: game.currentRound.skippedCount,
      points: points,
      durationSeconds: durationSeconds,
      startedAt: new Date(roundStartTime).toISOString(),
      endedAt: new Date(roundEndTime).toISOString(),
      finalWordIndex: game.currentRound.wordIndex,
    });

    const logger = sessionLoggerService.getLogger(gameId);
    if (logger) {
      logger.info({
        tag: 'ROUND',
        gameId,
        roundNumber: game.roundNumber,
        team: game.currentRound.team,
        correctCount: game.currentRound.correctCount,
        skippedCount: game.currentRound.skippedCount,
        points,
        durationSeconds,
        action: 'round_ended',
      }, `[ROUND] Round ${game.roundNumber} ended - correct: ${game.currentRound.correctCount}, skipped: ${game.currentRound.skippedCount}, points: ${points}`);
    }

    if (game.teams[game.currentRound.team].score >= game.settings.pointsToWin) {
      game.status = 'finished';
      game.endedAt = new Date().toISOString();
      game.winner = game.currentRound.team;

      if (logger) {
        logger.info({
          tag: 'GAME',
          gameId,
          winner: game.winner,
          teamAScore: game.teams.teamA.score,
          teamBScore: game.teams.teamB.score,
          totalRounds: game.history.length,
          duration: game.endedAt && game.startedAt ?
            Math.floor((new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 1000) : 0,
          action: 'game_finished',
        }, `[GAME] Game finished - Winner: ${game.teams[game.winner].name}`);
      }

      game.currentRound = null;
      this.snapshotService.saveSnapshot(game);
      return game;
    }

    game.currentTeam = game.currentTeam === 'teamA' ? 'teamB' : 'teamA';
    game.status = 'round-end';

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  markStealWord(gameId: string, playerId: string, success: boolean): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'last-word-steal' || !game.lastWordSteal || !game.currentRound) {
      return null;
    }

    // Verify player is on the stealing team
    const stealingTeam = game.teams[game.lastWordSteal.stealingTeam];
    const isOnStealingTeam = stealingTeam.players.some(p => p.id === playerId);
    if (!isOnStealingTeam) {
      return null;
    }

    // Mark the last card in the round
    const lastCard = game.currentRound.cards[game.currentRound.cards.length - 1];
    if (lastCard) {
      if (success) {
        lastCard.status = 'correct';
        // Award point to stealing team
        game.teams[game.lastWordSteal.stealingTeam].score += 1;
      } else {
        lastCard.status = 'skipped';
      }
    }

    // Clear last word steal and proceed to round end
    game.lastWordSteal = null;

    // Now properly end the round and add to history
    return this.finishRoundAfterSteal(gameId);
  }

  startLastWordSteal(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'pre-steal-countdown' || !game.lastWordSteal) {
      return null;
    }

    // Transition from pre-steal countdown to actual last word steal
    game.status = 'last-word-steal';
    game.lastWordSteal.startTime = Date.now();
    game.lastWordSteal.timeRemaining = 15;
    game.lastWordSteal.preStealCountdown = undefined;

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  endLastWordSteal(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'last-word-steal' || !game.lastWordSteal || !game.currentRound) {
      return null;
    }

    // Time expired, mark last card as skipped
    const lastCard = game.currentRound.cards[game.currentRound.cards.length - 1];
    if (lastCard && lastCard.status === 'pending') {
      lastCard.status = 'skipped';
    }

    // Clear last word steal and proceed to round end
    game.lastWordSteal = null;

    return this.finishRoundAfterSteal(gameId);
  }

  private finishRoundAfterSteal(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || !game.currentRound) {
      return null;
    }

    // Calculate points with skip penalty
    const correctPoints = game.currentRound.correctCount;
    const skipPenalty = game.currentRound.skippedCount * game.settings.skipPenalty;
    const points = correctPoints + skipPenalty;

    // Calculate round duration
    const roundStartTime = game.currentRound.startTime;
    const roundEndTime = Date.now();
    const durationSeconds = Math.floor((roundEndTime - roundStartTime) / 1000);

    // Note: Score was already updated during the round, only need to add to history
    game.history.push({
      roundNumber: game.roundNumber,
      team: game.currentRound.team,
      explainer: game.currentRound.explainer,
      cards: game.currentRound.cards,
      correctCount: game.currentRound.correctCount,
      skippedCount: game.currentRound.skippedCount,
      points: points,
      durationSeconds: durationSeconds,
      startedAt: new Date(roundStartTime).toISOString(),
      endedAt: new Date(roundEndTime).toISOString(),
      finalWordIndex: game.currentRound.wordIndex,
    });

    // Check for win condition
    if (game.teams.teamA.score >= game.settings.pointsToWin ||
        game.teams.teamB.score >= game.settings.pointsToWin) {
      game.status = 'finished';
      game.endedAt = new Date().toISOString();
      game.winner = game.teams.teamA.score >= game.settings.pointsToWin ? 'teamA' : 'teamB';
      game.currentRound = null;
      this.snapshotService.saveSnapshot(game);
      return game;
    }

    game.currentTeam = game.currentTeam === 'teamA' ? 'teamB' : 'teamA';
    game.status = 'round-end';

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  continueToNextRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'round-end') {
      return null;
    }

    game.currentRound = null;
    return this.startRound(gameId);
  }

  resetGame(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.host !== playerId) {
      return null;
    }

    game.status = 'lobby';
    game.startedAt = undefined;
    game.endedAt = undefined;
    game.teams.teamA.score = 0;
    game.teams.teamB.score = 0;
    game.currentRound = null;
    game.history = [];
    game.roundNumber = 0;
    game.teamARounds = 0;
    game.teamBRounds = 0;
    game.currentTeam = 'teamA';
    game.winner = undefined;
    game.currentDispute = null;
    game.disputeQueue = [];
    game.disputeHistory = [];
    game.usedWords = [];

    return game;
  }

  createRematchGame(
    originalGameId: string,
    hostId: string
  ): { newGameState: GameState; newRoomCode: string; oldGameState: GameState } | null {
    const oldGame = this.games.get(originalGameId);

    // Verify game exists, is finished, and caller is host
    if (!oldGame || oldGame.host !== hostId || oldGame.status !== 'finished') {
      return null;
    }

    // Archive the finished game
    this.snapshotService.archiveSnapshot(originalGameId);

    // Generate new room code (same logic as MenuScreen)
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGameId = `game-${newRoomCode}`;

    // Create new game with same settings
    const newGame = this.createGame(newGameId, hostId);

    // Copy settings from old game
    newGame.settings = { ...oldGame.settings };

    // Auto-assign players to same teams
    newGame.teams.teamA.players = [...oldGame.teams.teamA.players];
    newGame.teams.teamB.players = [...oldGame.teams.teamB.players];

    // Initialize presence for all players
    [...oldGame.teams.teamA.players, ...oldGame.teams.teamB.players].forEach((player) => {
      newGame.presence[player.id] = {
        connected: false, // They'll reconnect
        lastSeen: new Date().toISOString(),
      };
    });

    // Link games for future analytics
    newGame.previousGameId = originalGameId;

    // Save snapshot
    this.snapshotService.saveSnapshot(newGame);

    return {
      newGameState: newGame,
      newRoomCode,
      oldGameState: oldGame,
    };
  }

  closeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) {
      return;
    }

    // Mark game as finished if not already
    if (game.status !== 'finished') {
      game.status = 'finished';
    }

    // Set endedAt timestamp if not already set
    if (!game.endedAt) {
      game.endedAt = new Date().toISOString();
    }

    // Save final snapshot to disk
    this.snapshotService.saveSnapshot(game);

    // Remove from active games (RAM)
    this.games.delete(gameId);

    // End session logging
    sessionLoggerService.endSession(gameId);
  }

  deleteGame(gameId: string): void {
    this.snapshotService.deleteSnapshot(gameId);
    this.games.delete(gameId);

    // End session logging
    sessionLoggerService.endSession(gameId);
  }

  getAllGames(): Map<string, GameState> {
    return this.games;
  }

  getAllGamesSummary(): GameSummary[] {
    const summaries: GameSummary[] = [];
    for (const [, game] of this.games.entries()) {
      summaries.push({
        gameId: game.gameId,
        status: game.status,
        playerCount: game.teams.teamA.players.length + game.teams.teamB.players.length,
        roundNumber: game.roundNumber,
        teamAScore: game.teams.teamA.score,
        teamBScore: game.teams.teamB.score,
        createdAt: game.createdAt,
        host: game.host,
      });
    }
    return summaries;
  }

  restoreGame(game: GameState): void {
    // Migration: Initialize dispute fields for old game snapshots
    if (!game.currentDispute) {
      game.currentDispute = null;
    }
    if (!game.disputeQueue) {
      game.disputeQueue = [];
    }
    if (!game.disputeHistory) {
      game.disputeHistory = [];
    }
    if (!game.usedWords) {
      game.usedWords = [];
    }

    this.games.set(game.gameId, game);
  }

  getServerStats() {
    const rooms = Array.from(this.games.values());
    return {
      totalRooms: rooms.length,
      totalPlayers: rooms.reduce(
        (sum, game) => sum + game.teams.teamA.players.length + game.teams.teamB.players.length,
        0
      ),
      roomsByStatus: {
        lobby: rooms.filter((g) => g.status === 'lobby').length,
        countdown: rooms.filter((g) => g.status === 'countdown').length,
        playing: rooms.filter((g) => g.status === 'playing').length,
        'round-end': rooms.filter((g) => g.status === 'round-end').length,
        dispute: rooms.filter((g) => g.status === 'dispute').length,
        finished: rooms.filter((g) => g.status === 'finished').length,
      },
    };
  }

  cleanupEmptyLobbies(): number {
    let removed = 0;

    for (const [gameId, game] of this.games.entries()) {
      const active = Object.values(game.presence || {}).some((p) => p.connected);

      if (!active) {
        this.games.delete(gameId);
        removed++;
      }
    }

    return removed;
  }

  // Helper method to get all players from both teams
  private getAllPlayers(game: GameState): Player[] {
    return [...game.teams.teamA.players, ...game.teams.teamB.players];
  }

  // Initiate a dispute for a word
  initiateDispute(
    gameId: string,
    playerId: string,
    roundNumber: number,
    wordIndex: number,
    proposedStatus: WordStatus,
    reason: string
  ): GameResult | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    // Must be in round-end or dispute status
    if (game.status !== 'round-end' && game.status !== 'dispute') {
      return { error: 'Можна оскаржувати тільки після закінчення раунду' };
    }

    // Verify player is in the game
    const allPlayers = this.getAllPlayers(game);
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player) {
      return { error: 'Гравець не знайдений у грі' };
    }

    // Find the round history
    const roundHistory = game.history.find((h) => h.roundNumber === roundNumber);
    if (!roundHistory) {
      return { error: 'Раунд не знайдено' };
    }

    // Validate word index
    if (wordIndex < 0 || wordIndex >= roundHistory.cards.length) {
      return { error: 'Неправильний індекс слова' };
    }

    const wordCard = roundHistory.cards[wordIndex];

    // Can only dispute correct or skipped words
    if (wordCard.status !== 'correct' && wordCard.status !== 'skipped') {
      return { error: 'Можна оскаржувати тільки правильні або пропущені слова' };
    }

    // Check if word has already been disputed
    const alreadyDisputed = game.disputeHistory.some(
      (d) => d.roundNumber === roundNumber && d.wordIndex === wordIndex
    );
    if (alreadyDisputed) {
      return { error: 'Це слово вже було оскаржене' };
    }

    // Check if word is in current dispute or queue
    const inProgress = [game.currentDispute, ...game.disputeQueue].some(
      (d) => d && d.roundNumber === roundNumber && d.wordIndex === wordIndex
    );
    if (inProgress) {
      return { error: 'Оскарження цього слова вже в процесі' };
    }

    // Create dispute info
    const dispute: DisputeInfo = {
      disputeId: `dispute-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      roundNumber,
      wordIndex,
      word: wordCard.word,
      originalStatus: wordCard.status,
      proposedStatus,
      initiatedBy: player,
      reason,
      wordTeam: roundHistory.team, // The team that was playing this round
      votes: {},
      createdAt: new Date().toISOString(),
    };

    // If no dispute is active, set this as current dispute
    if (!game.currentDispute) {
      game.currentDispute = dispute;
      game.status = 'dispute';
    } else {
      // Add to queue
      game.disputeQueue.push(dispute);
    }

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  // Cast a vote on the current dispute
  castDisputeVote(gameId: string, playerId: string, vote: 'agree' | 'disagree'): GameResult | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    // Must be in dispute status
    if (game.status !== 'dispute') {
      return { error: 'Немає активного оскарження' };
    }

    if (!game.currentDispute) {
      return { error: 'Немає активного оскарження' };
    }

    // Verify player is in the game
    const allPlayers = this.getAllPlayers(game);
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player) {
      return { error: 'Гравець не знайдений у грі' };
    }

    // Determine which team the player is on
    const isOnTeamA = game.teams.teamA.players.some((p) => p.id === playerId);
    const playerTeam = isOnTeamA ? 'teamA' : 'teamB';

    // Only enemy team can vote (opposite of the team whose word is being disputed)
    if (playerTeam === game.currentDispute.wordTeam) {
      return { error: 'Ви не можете голосувати за слово своєї команди' };
    }

    // Record the vote
    game.currentDispute.votes[playerId] = vote;

    // Get enemy team players
    const enemyTeam = game.currentDispute.wordTeam === 'teamA' ? game.teams.teamB : game.teams.teamA;
    const enemyTeamPlayerIds = new Set(enemyTeam.players.map((p) => p.id));

    // Count votes from enemy team only
    const enemyVotes = Object.entries(game.currentDispute.votes).filter(
      ([voterId]) => enemyTeamPlayerIds.has(voterId)
    );
    const agreeVotes = enemyVotes.filter(([_, v]) => v === 'agree').length;
    const totalEnemyPlayers = enemyTeam.players.length;
    const requiredVotes = Math.ceil(totalEnemyPlayers / 2);

    // Resolve if half or more enemy team members voted "agree"
    if (agreeVotes >= requiredVotes) {
      return this.resolveDispute(gameId);
    }

    // Resolve as rejected if all enemy team members have voted and threshold not reached
    if (enemyVotes.length >= totalEnemyPlayers) {
      return this.resolveDispute(gameId);
    }

    // Not enough votes yet, just save and return
    this.snapshotService.saveSnapshot(game);
    return game;
  }

  // Resolve the current dispute (private method)
  private resolveDispute(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || !game.currentDispute) {
      return null;
    }

    const dispute = game.currentDispute;

    // Get enemy team players (only they can vote)
    const enemyTeam = dispute.wordTeam === 'teamA' ? game.teams.teamB : game.teams.teamA;
    const enemyTeamPlayerIds = new Set(enemyTeam.players.map((p) => p.id));

    // Count votes from enemy team only
    const enemyVotes = Object.entries(dispute.votes).filter(
      ([voterId]) => enemyTeamPlayerIds.has(voterId)
    );
    const agreeCount = enemyVotes.filter(([_, v]) => v === 'agree').length;
    const totalEnemyPlayers = enemyTeam.players.length;
    const requiredVotes = Math.ceil(totalEnemyPlayers / 2);

    // Determine resolution: accepted if half or more enemy team voted "agree"
    const resolution: 'accepted' | 'rejected' = agreeCount >= requiredVotes ? 'accepted' : 'rejected';

    dispute.resolution = resolution;
    dispute.resolvedAt = new Date().toISOString();

    // Apply changes if accepted
    if (resolution === 'accepted') {
      const roundHistory = game.history.find((h) => h.roundNumber === dispute.roundNumber);
      if (roundHistory) {
        const card = roundHistory.cards[dispute.wordIndex];
        const oldStatus = card.status;
        const newStatus = dispute.proposedStatus;

        // Update card status
        card.status = newStatus;

        // Calculate deltas for counts
        let correctDelta = 0;
        let skippedDelta = 0;

        if (oldStatus === 'correct' && newStatus === 'skipped') {
          correctDelta = -1;
          skippedDelta = 1;
        } else if (oldStatus === 'skipped' && newStatus === 'correct') {
          correctDelta = 1;
          skippedDelta = -1;
        }

        // Update round history counts
        roundHistory.correctCount += correctDelta;
        roundHistory.skippedCount += skippedDelta;
        roundHistory.points += correctDelta;

        // Update team score
        game.teams[roundHistory.team].score += correctDelta;

        // Check if score change causes win condition
        if (game.teams[roundHistory.team].score >= game.settings.pointsToWin) {
          game.status = 'finished';
          game.winner = roundHistory.team;
          game.endedAt = new Date().toISOString();
          game.currentDispute = null;
          game.disputeHistory.push(dispute);
          this.snapshotService.saveSnapshot(game);
          return game;
        }
      }
    }

    // Move current dispute to history
    game.disputeHistory.push(dispute);
    game.currentDispute = null;

    // Check if there are more disputes in the queue
    if (game.disputeQueue.length > 0) {
      game.currentDispute = game.disputeQueue.shift()!;
      game.status = 'dispute';
    } else {
      // No more disputes, return to round-end
      game.status = 'round-end';
    }

    this.snapshotService.saveSnapshot(game);
    return game;
  }

  // Cancel a dispute (only by initiator)
  cancelDispute(gameId: string, playerId: string): GameResult | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    // Must be in dispute status
    if (game.status !== 'dispute') {
      return { error: 'Немає активного оскарження' };
    }

    if (!game.currentDispute) {
      return { error: 'Немає активного оскарження' };
    }

    // Verify player is the initiator
    if (game.currentDispute.initiatedBy.id !== playerId) {
      return { error: 'Тільки ініціатор може скасувати оскарження' };
    }

    // Mark as cancelled
    game.currentDispute.resolution = 'tied'; // Use 'tied' to indicate no change
    game.currentDispute.resolvedAt = new Date().toISOString();

    // Move to history
    game.disputeHistory.push(game.currentDispute);
    game.currentDispute = null;

    // Check if there are more disputes in the queue
    if (game.disputeQueue.length > 0) {
      game.currentDispute = game.disputeQueue.shift()!;
      game.status = 'dispute';
    } else {
      // No more disputes, return to round-end
      game.status = 'round-end';
    }

    this.snapshotService.saveSnapshot(game);
    return game;
  }
}
