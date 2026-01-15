import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';

export const PreStealCountdownScreen: React.FC = () => {
  const { gameState, currentPlayer } = useGame();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (gameState?.lastWordSteal?.preStealCountdown !== undefined) {
      setCountdown(gameState.lastWordSteal.preStealCountdown);
    }
  }, [gameState?.lastWordSteal?.preStealCountdown]);

  if (!gameState || !gameState.lastWordSteal) return null;

  const { lastWordSteal } = gameState;
  const stealingTeam = gameState.teams[lastWordSteal.stealingTeam];
  const originalTeam = gameState.teams[lastWordSteal.originalTeam];
  const isOriginalExplainer = gameState.currentRound?.explainer.id === currentPlayer?.id;
  const isOnStealingTeam = stealingTeam.players.some(p => p.id === currentPlayer?.id);

  return (
    <div className="screen active">
      <div className="pre-steal-countdown-container">
        <div className="pre-steal-header">
          <h1>Перехоплення слова!</h1>
        </div>

        <div className="pre-steal-info">
          <p>
            Команда <strong>{originalTeam.name}</strong> не встигла пояснити останнє слово.
          </p>
          <p>
            Команда <strong>{stealingTeam.name}</strong> зараз спробує його вгадати!
          </p>
        </div>

        <div className="pre-steal-countdown-display">
          <div className="countdown-number">{countdown}</div>
          <div className="countdown-label">Приготуйтесь...</div>
        </div>

        {isOriginalExplainer && (
          <div className="pre-steal-warning explainer-warning">
            <div className="warning-icon">🤫</div>
            <p>Мовчіть! Суперники вгадуватимуть без підказок!</p>
          </div>
        )}

        {isOnStealingTeam && (
          <div className="pre-steal-hint stealing-team-hint">
            <div className="hint-icon">🎯</div>
            <p>Приготуйтесь вгадувати! Згадайте що чули...</p>
          </div>
        )}

        {!isOriginalExplainer && !isOnStealingTeam && (
          <div className="pre-steal-hint">
            <p>Чекаємо на початок перехоплення...</p>
          </div>
        )}

        <div className="teams-score">
          <div className="team-score team-a-score">
            <span className="team-name">{gameState.teams.teamA.name}</span>
            <span className="score">{gameState.teams.teamA.score}</span>
          </div>
          <div className="team-score team-b-score">
            <span className="team-name">{gameState.teams.teamB.name}</span>
            <span className="score">{gameState.teams.teamB.score}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
