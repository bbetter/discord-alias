import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';

export const MenuScreen: React.FC = () => {
  const { joinGame } = useGame();
  const { player } = useAuth();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = async () => {
    // Generate 6-character room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Always use the room code format for consistency
    // This ensures joining by room code works in both Discord and standalone modes
    const gameId = `game-${code}`;

    joinGame(gameId, code);
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 6) return;

    const gameId = `game-${roomCode}`;
    joinGame(gameId, roomCode);
  };

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

        <div className="menu-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
          >
            Створити кімнату
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={() => setShowJoinForm(!showJoinForm)}
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
            />
            <button className="btn btn-primary" onClick={handleJoinRoom}>
              Приєднатися
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowJoinForm(false)}
            >
              Скасувати
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
