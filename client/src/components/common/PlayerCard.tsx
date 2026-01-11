import React from 'react';
import type { Player } from '@/types/game';

interface PlayerCardProps {
  player: Player;
  online?: boolean;
  connections?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(({ player, online = true, connections = 1 }) => {
  return (
    <div className={`player-card ${online ? 'online' : 'offline'}`}>
      <div className="player-avatar">{player.username.charAt(0).toUpperCase()}</div>
      <div className="player-name">
        {player.username}
        {connections > 1 && <span className="connection-count">×{connections}</span>}
      </div>
    </div>
  );
});
