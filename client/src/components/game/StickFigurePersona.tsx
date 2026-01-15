import React from 'react';
import type { Player } from '@/types/game';

interface StickFigurePersonaProps {
  player: Player;
  teamColor: 'teamA' | 'teamB' | null;
  isSpeaking: boolean;
}

export const StickFigurePersona: React.FC<StickFigurePersonaProps> = React.memo(
  ({ player, teamColor, isSpeaking }) => {
    // Map team to color
    const colorMap: Record<string, string> = {
      teamA: '#3498db',
      teamB: '#e74c3c',
      null: '#95a5a6',
    };
    const color = colorMap[teamColor || 'null'];

    return (
      <div className={`stick-figure-persona ${isSpeaking ? 'speaking' : ''}`}>
        <div className="persona-username" style={{ color }}>
          {player.username}
        </div>
        <svg viewBox="0 0 100 100" className="persona-svg">
          {/* Head/Face Circle */}
          <circle cx="50" cy="50" r="40" fill={color} opacity="0.9" />

          {/* Eyes */}
          <circle cx="38" cy="42" r="4" fill="#2c3e50" />
          <circle cx="62" cy="42" r="4" fill="#2c3e50" />

          {/* Mouth - Closed state (visible when not speaking) */}
          <path
            d="M 35 58 Q 50 68 65 58"
            fill="none"
            stroke="#2c3e50"
            strokeWidth="3"
            strokeLinecap="round"
            className="persona-mouth-closed"
          />

          {/* Mouth - Open state (visible when speaking) */}
          <ellipse
            cx="50"
            cy="62"
            rx="10"
            ry="8"
            fill="#2c3e50"
            className="persona-mouth-open"
          />
        </svg>
      </div>
    );
  }
);

StickFigurePersona.displayName = 'StickFigurePersona';
