import React from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

export const RoundEndScreen: React.FC = () => {
  const {
    gameState,
    isHost,
    quitWarnings,
    showQuitDialog,
    showCloseDialog,
    continueNextRound,
    quitGame,
    confirmQuit,
    closeActivity,
    confirmCloseActivity,
  } = useGame();

  if (!gameState || !gameState.history.length) return null;

  const lastRound = gameState.history[gameState.history.length - 1];
  const nextTeamName = gameState.currentTeam === 'teamA' ? 'Команда А' : 'Команда Б';

  const generateQuitWarningMessage = () => {
    if (!quitWarnings) return '';

    const messages: string[] = [];

    if (quitWarnings.teamBelowMinimum) {
      messages.push(
        '⚠️ Після вашого виходу у вашій команді залишиться менше 2 гравців. Гра може не розпочатися або буде зупинена.'
      );
    }

    if (quitWarnings.isCurrentExplainer) {
      messages.push(
        '⚠️ Ви зараз пояснюєте слова. Ваш вихід автоматично завершить поточний раунд.'
      );
    }

    return (
      <div className="warning-messages">
        {messages.map((msg, idx) => (
          <p key={idx} className="warning-message">
            {msg}
          </p>
        ))}
        <p className="confirm-question">Ви впевнені, що хочете вийти?</p>
      </div>
    );
  };

  return (
    <div className="screen active">
      <div className="round-end-container">
        <button className="btn btn-danger btn-quit" onClick={quitGame}>
          Вийти з гри
        </button>

        <h2>Раунд завершено!</h2>
        <div className="round-summary">
          <div className="round-stats">
            <div className="stat">
              <span className="stat-label">Вірно:</span>
              <span className="stat-value correct">{lastRound.correctCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Пропущено:</span>
              <span className="stat-value skipped">{lastRound.skippedCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Очки:</span>
              <span className="stat-value points">{lastRound.points}</span>
            </div>
          </div>

          <div className="word-list">
            <h3>Слова раунду:</h3>
            <div className="words-grid">
              {lastRound.cards.map((card, idx) => (
                <div key={idx} className={`word-item ${card.status}`}>
                  <span className="word-text">{card.word}</span>
                  <span className="word-status">
                    {card.status === 'correct' ? '✓' : '→'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="score-display">
            <div className="team-score-item team-a-score">
              <span>Команда А</span>
              <strong>{gameState.teams.teamA.score}</strong>
            </div>
            <div className="team-score-item team-b-score">
              <span>Команда Б</span>
              <strong>{gameState.teams.teamB.score}</strong>
            </div>
          </div>

          <div className="next-round-info">Наступний хід: {nextTeamName}</div>
        </div>

        <button className="btn btn-primary btn-large" onClick={continueNextRound}>
          Продовжити
        </button>

        {isHost && (
          <button className="btn btn-danger btn-close-activity" onClick={closeActivity}>
            Закрити активність
          </button>
        )}

        <ConfirmationDialog
          isOpen={showQuitDialog}
          title="Вийти з гри?"
          message={generateQuitWarningMessage()}
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
