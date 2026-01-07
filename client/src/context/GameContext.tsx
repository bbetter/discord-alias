import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/services/socket';
import type { GameState, Player, QuitWarnings } from '@/types/game';
import { useAuth } from './AuthContext';

interface GameContextType {
  gameState: GameState | null;
  currentPlayer: Player | null;
  roomCode: string | null;
  isHost: boolean;
  socket: Socket | null;
  error: string | null;
  quitWarnings: QuitWarnings | null;
  showQuitDialog: boolean;
  showCloseDialog: boolean;
  rematchInfo: { newGameId: string; newRoomCode: string; message: string } | null;
  joinGame: (gameId: string, roomCode: string) => void;
  selectTeam: (team: 'teamA' | 'teamB') => void;
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
  closeActivity: () => void;
  confirmCloseActivity: (confirmed: boolean) => void;
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
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [rematchInfo, setRematchInfo] = useState<{
    newGameId: string;
    newRoomCode: string;
    message: string;
  } | null>(null);

  const isHost = gameState?.host === currentPlayer?.id;

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
      console.log('[Socket] Reconnected');
      if (roomCode && currentPlayer && gameState) {
        console.log('[Socket] Re-joining game after reconnect');
        socket.emit('join-game', {
          gameId: gameState.gameId,
          player: currentPlayer,
        });
      }
    };

    socket.on('connect', handleReconnect);

    socket.on('player-joined', (data: { player: Player; gameState: GameState }) => {
      console.log('[Socket] player-joined event received', data.player.id, data.player.username);
      setGameState(data.gameState);
    });

    socket.on('game-state', (data: { gameState: GameState }) => {
      console.log('[Socket] game-state event received', data.gameState.gameId, data.gameState.teams.teamA.players.length, data.gameState.teams.teamB.players.length);
      setGameState(data.gameState);
    });

    socket.on('round-started', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    });

    socket.on('timer-update', (data: { timeRemaining: number }) => {
      setGameState((prev) => {
        if (!prev || !prev.currentRound) return prev;
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            timeRemaining: data.timeRemaining,
          },
        };
      });
    });

    socket.on('round-ended', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    socket.on('quit-warnings', (data: { warnings: QuitWarnings }) => {
      setQuitWarnings(data.warnings);
    });

    socket.on('quit-confirmation-required', (data: { warnings: QuitWarnings }) => {
      setQuitWarnings(data.warnings);
      setShowQuitDialog(true);
    });

    socket.on('quit-confirmed', () => {
      setGameState(null);
      setRoomCode(null);
      setShowQuitDialog(false);
    });

    socket.on('player-quit', (data: { playerId: string; playerName: string }) => {
      console.log(`Player ${data.playerName} has quit`);
    });

    socket.on('close-activity-confirmation-required', () => {
      setShowCloseDialog(true);
    });

    socket.on('activity-closed', (data: { message: string }) => {
      alert(data.message);
      disconnectSocket();
      setGameState(null);
      setRoomCode(null);
      setShowCloseDialog(false);
    });

    socket.on('rematch-created', (data: {
      newGameId: string;
      newRoomCode: string;
      message: string
    }) => {
      console.log('[Socket] Rematch created:', data);
      setRematchInfo(data);
    });

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('player-joined');
      socket.off('game-state');
      socket.off('round-started');
      socket.off('timer-update');
      socket.off('round-ended');
      socket.off('error');
      socket.off('quit-warnings');
      socket.off('quit-confirmation-required');
      socket.off('quit-confirmed');
      socket.off('player-quit');
      socket.off('close-activity-confirmation-required');
      socket.off('activity-closed');
      socket.off('rematch-created');
    };
  }, [socket, roomCode, currentPlayer, gameState]);

  const joinGame = useCallback(
    (gameId: string, code: string) => {
      if (!socket || !currentPlayer) return;

      setRoomCode(code);
      console.log('[Socket] Emitting join-game', { gameId, playerId: currentPlayer.id, playerName: currentPlayer.username });
      socket.emit('join-game', {
        gameId,
        player: currentPlayer,
      });
    },
    [socket, currentPlayer]
  );

  const selectTeam = useCallback(
    (team: 'teamA' | 'teamB') => {
      if (!socket || !gameState) return;

      socket.emit('select-team', {
        gameId: gameState.gameId,
        team,
      });
    },
    [socket, gameState]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameState['settings']>) => {
      if (!socket || !gameState) return;

      socket.emit('update-settings', {
        gameId: gameState.gameId,
        settings,
      });
    },
    [socket, gameState]
  );

  const startGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('start-game', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const markWord = useCallback(
    (status: 'correct' | 'skipped') => {
      if (!socket || !gameState) return;

      socket.emit('mark-word', {
        gameId: gameState.gameId,
        status,
      });
    },
    [socket, gameState]
  );

  const endRoundEarly = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('end-round-early', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const continueNextRound = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('continue-next-round', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const resetGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('reset-game', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const quitGame = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('request-quit-warnings', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const confirmQuit = useCallback(
    (confirmed: boolean) => {
      if (!socket || !gameState) return;

      if (confirmed) {
        socket.emit('player-quit', {
          gameId: gameState.gameId,
          confirmed: true,
        });
      } else {
        setShowQuitDialog(false);
      }
    },
    [socket, gameState]
  );

  const closeActivity = useCallback(() => {
    if (!socket || !gameState || !isHost) return;

    socket.emit('host-close-activity', {
      gameId: gameState.gameId,
      confirmed: false,
    });
  }, [socket, gameState, isHost]);

  const confirmCloseActivity = useCallback(
    (confirmed: boolean) => {
      if (!socket || !gameState) return;

      if (confirmed) {
        socket.emit('host-close-activity', {
          gameId: gameState.gameId,
          confirmed: true,
        });
      } else {
        setShowCloseDialog(false);
      }
    },
    [socket, gameState]
  );

  const createRematch = useCallback(() => {
    if (!socket || !gameState) return;

    socket.emit('create-rematch', {
      gameId: gameState.gameId,
    });
  }, [socket, gameState]);

  const clearRematchInfo = useCallback(() => {
    setRematchInfo(null);
  }, []);

  const value: GameContextType = {
    gameState,
    currentPlayer,
    roomCode,
    isHost,
    socket,
    error,
    quitWarnings,
    showQuitDialog,
    showCloseDialog,
    rematchInfo,
    joinGame,
    selectTeam,
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
    closeActivity,
    confirmCloseActivity,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
