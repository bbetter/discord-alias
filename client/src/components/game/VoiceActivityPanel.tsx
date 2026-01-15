import React from 'react';
import { useGame } from '@/context/GameContext';
import { useVoiceActivity } from '@/context/VoiceActivityContext';
import { StickFigurePersona } from './StickFigurePersona';
import type { Player } from '@/types/game';

export const VoiceActivityPanel: React.FC = () => {
  const { gameState } = useGame();
  const { isPlayerSpeaking } = useVoiceActivity();

  if (!gameState) {
    return null;
  }

  const { teams } = gameState;
  const teamAPlayers = teams.teamA.players;
  const teamBPlayers = teams.teamB.players;

  // Don't render if both teams are empty
  if (teamAPlayers.length === 0 && teamBPlayers.length === 0) {
    return null;
  }

  return (
    <div className="voice-activity-panel">
      {/* Team A Section */}
      {teamAPlayers.length > 0 && (
        <div className="team-section team-a-section">
          <div className="team-label team-a-label">Команда А</div>
          <div className="team-players">
            {teamAPlayers.map((player: Player) => (
              <StickFigurePersona
                key={player.id}
                player={player}
                teamColor="teamA"
                isSpeaking={isPlayerSpeaking(player.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider (only show if both teams have players) */}
      {teamAPlayers.length > 0 && teamBPlayers.length > 0 && (
        <div className="team-divider" />
      )}

      {/* Team B Section */}
      {teamBPlayers.length > 0 && (
        <div className="team-section team-b-section">
          <div className="team-label team-b-label">Команда Б</div>
          <div className="team-players">
            {teamBPlayers.map((player: Player) => (
              <StickFigurePersona
                key={player.id}
                player={player}
                teamColor="teamB"
                isSpeaking={isPlayerSpeaking(player.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
