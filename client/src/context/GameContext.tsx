import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/services/socket';
import type { GameState, Player, QuitWarnings, WordStatus } from '@/types/game';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import { logger } from '@/utils/logger';

interface GameContextType {
  gameState: GameState | null;
  currentPlayer: Player | null;
  roomCode: string | null;
  isHost: boolean;
  socket: Socket | null;
  error: string | null;
  quitWarnings: QuitWarnings | null;
  showQuitDialog: boolean;
  rematchInfo: { newGameId: string; newRoomCode: string; message: string } | null;
  availableCategories: string[];
  joinGame: (gameId: string, roomCode: string) => void;
  selectTeam: (team: 'teamA' | 'teamB') => void;
  renameTeam: (teamId: 'teamA' | 'teamB', newName: string) => void;
  updateSettings: (settings: Partial<GameState['settings']>) => void;
  startGame: () => void;
  markWord: (status: 'correct' | 'skipped') => void;
  endRoundEarly: () => void;
  continueNextRound: () => void;
  resetGame: () => void;
  createRematch: () => void;
  clearRematchInfo: () => void;
  quitGame: () => void;
  confirmQuit: (confirmed: boolean) => void;
  initiateDispute: (roundNumber: number, wordIndex: number, proposedStatus: WordStatus, reason: string) => void;
  castDisputeVote: (vote: 'agree' | 'disagree') => void;
  cancelDispute: () => void;
  markStealWord: (success: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { isReady, player } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quitWarnings, setQuitWarnings] = useState<QuitWarnings | null>(null);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [rematchInfo, setRematchInfo] = useState<{
    newGameId: string;
    newRoomCode: string;
    message: string;
  } | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['змішані']);

  // Use refs for values needed in socket event handlers to avoid dependency issues
  const roomCodeRef = useRef<string | null>(null);
  const currentPlayerRef = useRef<Player | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  useEffect(() => {
    roomCodeRef.current = roomCode;
    currentPlayerRef.current = currentPlayer;
    gameIdRef.current = gameState?.gameId || null;
  }, [roomCode, currentPlayer, gameState?.gameId]);

  const isHost = useMemo(
    () => gameState?.host === currentPlayer?.id,
    [gameState?.host, currentPlayer?.id]
  );

  // Initialize socket
  useEffect(() => {
    if (isReady && player) {
      const newSocket = getSocket();
      setSocket(newSocket);

      setCurrentPlayer(player);

      return () => {
        // Don't disconnect on cleanup, just remove listeners
      };
    }
  }, [isReady, player]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle reconnection - re-join game if we were in one
    const handleReconnect = () => {
      logger.log('[Socket] Reconnected');
      if (roomCodeRef.current && currentPlayerRef.current && gameIdRef.current) {
        logger.log('[Socket] Re-joining game after reconnect');
        socket.emit(SOCKET_EVENTS.JOIN_GAME, {
          gameId: gameIdRef.current,
          player: currentPlayerRef.current,
        });
      }
    };

    socket.on(SOCKET_EVENTS.CONNECT, handleReconnect);

    // Request available categories
    socket.on('categories', (categories: string[]) => {
      logger.log('[Socket] Received categories:', categories);
      setAvailableCategories(categories);
    });

    // Request categories on connection
    socket.emit('get-categories');

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: { player: Player; gameState: GameState }) => {
      logger.log('[Socket] player-joined event received', data.player.id, data.player.username);
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.GAME_STATE, (data: { gameState: GameState }) => {
      logger.log('[Socket] game-state event received', data.gameState.gameId, data.gameState.status, data.gameState.roundNumber);
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.ROUND_STARTED, (data: { gameState: GameState }) => {
      logger.log('[Socket] round-started event', data.gameState.roundNumber);
      setGameState(data.gameState);
    });

    // Note: timer-update handler removed - timer is now handled locally in GameScreen
    // to prevent re-rendering the entire context tree every second

    socket.on(SOCKET_EVENTS.ROUND_ENDED, (data: { gameState: GameState }) => {
      logger.log('[Socket] round-ended event', data.gameState.status, data.gameState.roundNumber);
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.ERROR, (data: { message: string }) => {
      setError(data.message);
      // Clear any existing error timeout to prevent memory leaks
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 5000);
    });

    socket.on(SOCKET_EVENTS.QUIT_WARNINGS, (data: { warnings: QuitWarnings }) => {
      setQuitWarnings(data.warnings);
    });

    socket.on(SOCKET_EVENTS.QUIT_CONFIRMATION_REQUIRED, (data: { warnings: QuitWarnings }) => {
      setQuitWarnings(data.warnings);
      setShowQuitDialog(true);
    });

    socket.on(SOCKET_EVENTS.QUIT_CONFIRMED, () => {
      setGameState(null);
      setRoomCode(null);
      setShowQuitDialog(false);
    });

    socket.on(SOCKET_EVENTS.PLAYER_QUIT_EVENT, (data: { playerId: string; playerName: string }) => {
      logger.log(`Player ${data.playerName} has quit`);
    });

    socket.on(SOCKET_EVENTS.REMATCH_CREATED, (data: {
      newGameId: string;
      newRoomCode: string;
      message: string
    }) => {
      logger.log('[Socket] Rematch created:', data);
      setRematchInfo(data);
    });

    socket.on(SOCKET_EVENTS.DISPUTE_STARTED, (data: { gameState: GameState }) => {
      logger.log('[Socket] Dispute started');
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.DISPUTE_VOTE_RECORDED, (data: { gameState: GameState }) => {
      logger.log('[Socket] Dispute vote recorded');
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.DISPUTE_RESOLVED, (data: { gameState: GameState }) => {
      logger.log('[Socket] Dispute resolved');
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.DISPUTE_ERROR, (data: { message: string }) => {
      logger.log('[Socket] Dispute error:', data.message);
      setError(data.message);
      // Clear any existing error timeout to prevent memory leaks
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 5000);
    });

    socket.on(SOCKET_EVENTS.PRE_STEAL_COUNTDOWN_STARTED, (data: { gameState: GameState }) => {
      logger.log('[Socket] Pre-steal countdown started');
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.PRE_STEAL_COUNTDOWN_UPDATE, (data: { timeRemaining: number }) => {
      setGameState((prevState) => {
        if (!prevState || !prevState.lastWordSteal) return prevState;
        return {
          ...prevState,
          lastWordSteal: {
            ...prevState.lastWordSteal,
            preStealCountdown: data.timeRemaining,
          },
        };
      });
    });

    socket.on(SOCKET_EVENTS.LAST_WORD_STEAL_STARTED, (data: { gameState: GameState }) => {
      logger.log('[Socket] Last word steal started');
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.STEAL_TIMER_UPDATE, (data: { timeRemaining: number }) => {
      setGameState((prevState) => {
        if (!prevState || !prevState.lastWordSteal) return prevState;
        return {
          ...prevState,
          lastWordSteal: {
            ...prevState.lastWordSteal,
            timeRemaining: data.timeRemaining,
          },
        };
      });
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, handleReconnect);
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.GAME_STATE);
      socket.off(SOCKET_EVENTS.ROUND_STARTED);
      socket.off(SOCKET_EVENTS.ROUND_ENDED);
      socket.off(SOCKET_EVENTS.ERROR);
      socket.off(SOCKET_EVENTS.QUIT_WARNINGS);
      socket.off(SOCKET_EVENTS.QUIT_CONFIRMATION_REQUIRED);
      socket.off(SOCKET_EVENTS.QUIT_CONFIRMED);
      socket.off(SOCKET_EVENTS.PLAYER_QUIT_EVENT);
      socket.off(SOCKET_EVENTS.REMATCH_CREATED);
      socket.off(SOCKET_EVENTS.DISPUTE_STARTED);
      socket.off(SOCKET_EVENTS.DISPUTE_VOTE_RECORDED);
      socket.off(SOCKET_EVENTS.DISPUTE_RESOLVED);
      socket.off(SOCKET_EVENTS.DISPUTE_ERROR);
      socket.off(SOCKET_EVENTS.PRE_STEAL_COUNTDOWN_STARTED);
      socket.off(SOCKET_EVENTS.PRE_STEAL_COUNTDOWN_UPDATE);
      socket.off(SOCKET_EVENTS.LAST_WORD_STEAL_STARTED);
      socket.off(SOCKET_EVENTS.STEAL_TIMER_UPDATE);

      // Clear any pending error timeout to prevent memory leaks
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, [socket]); // Only depend on socket - use refs for values in handlers

  const joinGame = useCallback(
    (gameId: string, code: string) => {
      if (!socket || !currentPlayer) return;

      setRoomCode(code);
      logger.log('[Socket] Emitting join-game', { gameId, playerId: currentPlayer.id, playerName: currentPlayer.username });
      socket.emit(SOCKET_EVENTS.JOIN_GAME, {
        gameId,
        player: currentPlayer,
      });
    },
    [socket, currentPlayer]
  );

  const selectTeam = useCallback(
    (team: 'teamA' | 'teamB') => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.SELECT_TEAM, {
        gameId: gameState.gameId,
        team,
      });
    },
    [socket, gameState]
  );

  const renameTeam = useCallback(
    (teamId: 'teamA' | 'teamB', newName: string) => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.RENAME_TEAM, {
        gameId: gameState.gameId,
        teamId,
        newName,
      });
    },
    [socket, gameState]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameState['settings']>) => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.UPDATE_SETTINGS, {
        gameId: gameState.gameId,
        settings,
      });
    },
    [socket, gameState]
  );

  const startGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.START_GAME, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const markWord = useCallback(
    (status: 'correct' | 'skipped') => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.MARK_WORD, {
        gameId: gameState.gameId,
        status,
      });
    },
    [socket, gameState]
  );

  const endRoundEarly = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.END_ROUND_EARLY, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const continueNextRound = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.CONTINUE_NEXT_ROUND, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const resetGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.RESET_GAME, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const quitGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.REQUEST_QUIT_WARNINGS, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const confirmQuit = useCallback(
    (confirmed: boolean) => {
      if (!socket || !gameState) return;

      if (confirmed) {
        socket.emit(SOCKET_EVENTS.PLAYER_QUIT, {
          gameId: gameState.gameId,
          confirmed: true,
        });
      } else {
        setShowQuitDialog(false);
      }
    },
    [socket, gameState]
  );

  const createRematch = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.CREATE_REMATCH, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const clearRematchInfo = useCallback(() => {
    setRematchInfo(null);
  }, []);

  const initiateDispute = useCallback(
    (roundNumber: number, wordIndex: number, proposedStatus: WordStatus, reason: string) => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.INITIATE_DISPUTE, {
        gameId: gameState.gameId,
        roundNumber,
        wordIndex,
        proposedStatus,
        reason,
      });
    },
    [socket, gameState]
  );

  const castDisputeVote = useCallback(
    (vote: 'agree' | 'disagree') => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.CAST_DISPUTE_VOTE, {
        gameId: gameState.gameId,
        vote,
      });
    },
    [socket, gameState]
  );

  const cancelDispute = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit(SOCKET_EVENTS.CANCEL_DISPUTE, {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const markStealWord = useCallback(
    (success: boolean) => {
      if (!socket || !gameState) return;

      socket.emit(SOCKET_EVENTS.MARK_STEAL_WORD, {
        gameId: gameState.gameId,
        success,
      });
    },
    [socket, gameState]
  );

  const value: GameContextType = useMemo(
    () => ({
      gameState,
      currentPlayer,
      roomCode,
      isHost,
      socket,
      error,
      quitWarnings,
      showQuitDialog,
      rematchInfo,
      availableCategories,
      joinGame,
      selectTeam,
      renameTeam,
      updateSettings,
      startGame,
      markWord,
      endRoundEarly,
      continueNextRound,
      resetGame,
      createRematch,
      clearRematchInfo,
      quitGame,
      confirmQuit,
      initiateDispute,
      castDisputeVote,
      cancelDispute,
      markStealWord,
    }),
    [
      gameState,
      currentPlayer,
      roomCode,
      isHost,
      socket,
      error,
      quitWarnings,
      showQuitDialog,
      rematchInfo,
      availableCategories,
      joinGame,
      selectTeam,
      renameTeam,
      updateSettings,
      startGame,
      markWord,
      endRoundEarly,
      continueNextRound,
      resetGame,
      createRematch,
      clearRematchInfo,
      quitGame,
      confirmQuit,
      initiateDispute,
      castDisputeVote,
      cancelDispute,
      markStealWord,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
