import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';

export const MenuScreen: React.FC = () => {
  const { joinGame, socket, error } = useGame();
  const { player } = useAuth();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    if (!socket || !player || isCreating) {
      console.warn('Socket or player not ready', { hasSocket: !!socket, hasPlayer: !!player });
      return;
    }

    setIsCreating(true);

    // Generate 6-character room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Always use the room code format for consistency
    // This ensures joining by room code works in both Discord and standalone modes
    const gameId = `game-${code}`;

    joinGame(gameId, code);

    // Reset loading state after a timeout if not redirected
    setTimeout(() => setIsCreating(false), 3000);
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 6 || !socket || !player || isJoining) return;

    setIsJoining(true);

    const gameId = `game-${roomCode}`;
    joinGame(gameId, roomCode);

    // Reset loading state after a timeout if not redirected
    setTimeout(() => setIsJoining(false), 3000);
  };

  const isSocketReady = socket && player;

  return (
    <div className="screen active">
      <div className="menu-container">
        <h1>🎮 Alias</h1>
        <p className="subtitle">Гра в пояснення слів</p>

        {player && (
          <div className="player-info">
            {player.avatar && (
              <img
                src={`https://cdn.discordapp.com/avatars/${player.id}/${player.avatar}.png`}
                alt={player.username}
                className="player-avatar"
              />
            )}
            <span className="player-name">{player.username}</span>
          </div>
        )}

        {!isSocketReady && (
          <div className="info-message">
            Підключення до сервера...
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="menu-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
            disabled={!isSocketReady || isCreating}
          >
            {isCreating ? 'Створюємо...' : 'Створити кімнату'}
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={() => setShowJoinForm(!showJoinForm)}
            disabled={!isSocketReady}
          >
            Приєднатися за кодом
          </button>
        </div>

        {showJoinForm && (
          <div className="join-room-form">
            <input
              type="text"
              placeholder="Введіть код кімнати"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              disabled={isJoining}
            />
            <button
              className="btn btn-primary"
              onClick={handleJoinRoom}
              disabled={!roomCode || roomCode.length !== 6 || isJoining || !isSocketReady}
            >
              {isJoining ? 'Підключаємося...' : 'Приєднатися'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowJoinForm(false)}
              disabled={isJoining}
            >
              Скасувати
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
