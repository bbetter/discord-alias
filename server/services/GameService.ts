import { getRandomWords } from '../word-loader.js';
import { SnapshotService } from './SnapshotService.js';
import type {
  GameState,
  GameSettings,
  Player,
  TeamId,
  WordStatus,
  GameSummary,
  QuitWarnings,
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
      history: [],
      roundNumber: 0,
      teamARounds: 0,
      teamBRounds: 0,
      currentTeam: 'teamA',
    };

    this.games.set(instanceId, gameState);
    this.snapshotService.saveSnapshot(gameState);
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

    this.snapshotService.saveSnapshot(game);

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
      game.settings.wordsPerRound
    ).map((wordObj) => ({
      word: wordObj.word,
      difficulty: wordObj.difficulty,
      status: 'pending' as WordStatus,
    }));

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

    const points = game.currentRound.correctCount;

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
    });

    if (game.teams[game.currentRound.team].score >= game.settings.pointsToWin) {
      game.status = 'finished';
      game.endedAt = new Date().toISOString();
      game.winner = game.currentRound.team;
      game.currentRound = null;
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
  }

  deleteGame(gameId: string): void {
    this.snapshotService.deleteSnapshot(gameId);
    this.games.delete(gameId);
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
}
