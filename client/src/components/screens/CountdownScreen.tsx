import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';

export const CountdownScreen: React.FC = () => {
  const { gameState, socket, currentPlayer } = useGame();
  const [countdownText, setCountdownText] = useState('Готуйтесь...');
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!gameState || !gameState.currentRound) return;

    const sequence = [
      { delay: 0, text: 'Готуйтесь...', number: null },
      { delay: 1000, text: 'На старт...', number: 3 },
      { delay: 2000, text: 'Увага...', number: 2 },
      { delay: 3000, text: 'Вперед!', number: 1 },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    sequence.forEach(({ delay, text, number }) => {
      const timeout = setTimeout(() => {
        setCountdownText(text);
        setCountdownNumber(number);
      }, delay);
      timeouts.push(timeout);
    });

    // After countdown completes, notify server to start playing
    const startTimeout = setTimeout(() => {
      if (socket) {
        socket.emit('countdown-complete', { gameId: gameState.gameId });
      }
    }, 4000);
    timeouts.push(startTimeout);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [gameState, socket]);

  if (!gameState || !gameState.currentRound) return null;

  const { currentRound, currentTeam } = gameState;
  const teamName = currentTeam === 'teamA' ? 'Команда А' : 'Команда Б';
  const teamColor = currentTeam === 'teamA' ? 'team-a' : 'team-b';
  const isExplainer = currentPlayer?.id === currentRound.explainer.id;

  return (
    <div className="screen active">
      <div className="countdown-container">
        <div className={`countdown-team-badge ${teamColor}`}>
          <div className="team-name">{teamName}</div>
        </div>

        <div className="countdown-explainer">
          <div className="explainer-label">Пояснює:</div>
          <div className="explainer-name">{currentRound.explainer.username}</div>
        </div>

        <div className="countdown-display">
          <div className="countdown-text">{countdownText}</div>
          {countdownNumber !== null && (
            <div className="countdown-number">{countdownNumber}</div>
          )}
        </div>

        <div className="countdown-hint">
          {isExplainer
            ? 'Підготуйтесь пояснювати слова!'
            : 'Підготуйтесь вгадувати слова!'}
        </div>
      </div>
    </div>
  );
};
