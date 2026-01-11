import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';

export const GameScreen: React.FC = () => {
  const {
    gameState,
    currentPlayer,
    isHost,
    quitWarnings,
    showQuitDialog,
    showCloseDialog,
    markWord,
    endRoundEarly,
    quitGame,
    confirmQuit,
    closeActivity,
    confirmCloseActivity,
  } = useGame();

  // Local timer state to prevent re-rendering entire context tree every second
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  if (!gameState || !gameState.currentRound || !currentPlayer) return null;

  const { currentRound, teams } = gameState;

  // Initialize and manage local timer
  useEffect(() => {
    // Initialize timer with value from gameState
    setTimeRemaining(currentRound.timeRemaining);

    // Set up interval to count down
    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentRound.startTime]); // startTime changes when a new round begins

  const isExplainer = currentRound.explainer.id === currentPlayer.id;
  const currentCard = currentRound.cards[currentRound.wordIndex];
  const currentTeamPlayers = teams[currentRound.team].players;
  const isTeamMember =
    currentTeamPlayers.some((p) => p.id === currentPlayer.id) && !isExplainer;
  const isOpponent = !currentTeamPlayers.some((p) => p.id === currentPlayer.id);

  // Keyboard shortcuts for explainer
  useEffect(() => {
    if (!isExplainer || gameState.status !== 'playing' || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        markWord('correct');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        markWord('skipped');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        endRoundEarly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExplainer, gameState.status, currentCard, markWord, endRoundEarly]);
  const teamName = currentRound.team === 'teamA' ? 'Команда А' : 'Команда Б';

  return (
    <div className="screen active">
      <div className="game-container">
        <button className="btn btn-danger btn-quit" onClick={quitGame}>
          Вийти з гри
        </button>

        <div className="game-header">
          <div className="score-display">
            <div className="team-score-item team-a-score">
              <span>Команда А</span>
              <strong>{teams.teamA.score}</strong>
            </div>
            <div className={`timer ${timeRemaining <= 10 ? 'warning' : ''}`}>
              {timeRemaining}
            </div>
            <div className="team-score-item team-b-score">
              <span>Команда Б</span>
              <strong>{teams.teamB.score}</strong>
            </div>
          </div>
        </div>

        {isExplainer && (
          <div className="game-view">
            <div className="current-team-display">
              Ви пояснюєте для: {teamName}
            </div>
            <div className="word-card">
              <div className="word-display">
                {currentCard ? currentCard.word : 'Раунд завершено'}
              </div>
              <div className="word-counter">
                Слово {currentRound.wordIndex + 1}/{currentRound.cards.length}
              </div>
            </div>
            {currentCard && (
              <div className="action-buttons">
                <button
                  className="btn btn-success btn-large"
                  onClick={() => markWord('correct')}
                >
                  ✓ Вірно <span className="keyboard-hint">(Space/Enter)</span>
                </button>
                <button
                  className="btn btn-warning btn-large"
                  onClick={() => markWord('skipped')}
                >
                  → Пропустити <span className="keyboard-hint">(S)</span>
                </button>
              </div>
            )}
            <button className="btn btn-danger" onClick={endRoundEarly}>
              Завершити раунд <span className="keyboard-hint">(ESC)</span>
            </button>
            <p className="hint-text">
              Не використовуйте однокорінні або схожі слова!
            </p>
          </div>
        )}

        {isTeamMember && (
          <div className="game-view">
            <div className="waiting-display">
              <h2>{currentRound.explainer.username} пояснює слова</h2>
              <p>Вгадуйте слова!</p>
              <div className="word-counter">
                Слово {currentRound.wordIndex + 1}/{currentRound.cards.length}
              </div>
            </div>
          </div>
        )}

        {isOpponent && (
          <div className="game-view">
            <div className="waiting-display">
              <h2>{teamName} грає</h2>
              <p>Зачекайте свого ходу...</p>
            </div>
          </div>
        )}

        {isHost && (
          <button className="btn btn-danger btn-close-activity" onClick={closeActivity}>
            Закрити активність
          </button>
        )}

        <ConfirmationDialog
          isOpen={showQuitDialog}
          title="Вийти з гри?"
          message={<QuitWarningMessage warnings={quitWarnings} />}
          confirmText="Вийти"
          cancelText="Скасувати"
          confirmStyle="danger"
          onConfirm={() => confirmQuit(true)}
          onCancel={() => confirmQuit(false)}
        />

        <ConfirmationDialog
          isOpen={showCloseDialog}
          title="Закрити активність?"
          message="Ви впевнені, що хочете закрити цю гру? Всі гравці будуть відключені, а гра буде видалена."
          confirmText="Закрити гру"
          cancelText="Скасувати"
          confirmStyle="danger"
          onConfirm={() => confirmCloseActivity(true)}
          onCancel={() => confirmCloseActivity(false)}
        />
      </div>
    </div>
  );
};
