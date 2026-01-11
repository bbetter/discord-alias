import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';

export const LastWordStealScreen: React.FC = () => {
  const { gameState, currentPlayer, markStealWord } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(15);

  useEffect(() => {
    if (gameState?.lastWordSteal) {
      setTimeRemaining(gameState.lastWordSteal.timeRemaining);
    }
  }, [gameState?.lastWordSteal]);

  if (!gameState || !gameState.lastWordSteal) return null;

  const { lastWordSteal } = gameState;
  const stealingTeam = gameState.teams[lastWordSteal.stealingTeam];
  const originalTeam = gameState.teams[lastWordSteal.originalTeam];
  const isOnStealingTeam = stealingTeam.players.some(p => p.id === currentPlayer?.id);

  return (
    <div className="screen active">
      <div className="last-word-steal-container">
        <div className="steal-header">
          <h1>🎯 Останнє слово!</h1>
          <div className="steal-timer">
            <div className="timer-circle">
              <span className="timer-value">{timeRemaining}</span>
            </div>
          </div>
        </div>

        <div className="steal-info">
          <p className="steal-description">
            Команда <strong>{originalTeam.name}</strong> не встигла пояснити останнє слово.
            <br />
            Команда <strong>{stealingTeam.name}</strong> може його перехопити!
          </p>
        </div>

        <div className="steal-word-display">
          <div className="word-card steal-word">
            <span className="word">{lastWordSteal.word}</span>
            <span className="difficulty">{lastWordSteal.difficulty}</span>
          </div>
        </div>

        {isOnStealingTeam && (
          <div className="steal-actions">
            <button
              className="btn btn-success btn-large"
              onClick={() => markStealWord(true)}
            >
              ✓ Вгадали
            </button>
            <button
              className="btn btn-danger btn-large"
              onClick={() => markStealWord(false)}
            >
              ✗ Не вгадали
            </button>
          </div>
        )}

        {!isOnStealingTeam && (
          <div className="steal-waiting">
            <p>Чекаємо на відповідь команди {stealingTeam.name}...</p>
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
