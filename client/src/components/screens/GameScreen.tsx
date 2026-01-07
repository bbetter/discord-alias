import React from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

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

  if (!gameState || !gameState.currentRound || !currentPlayer) return null;

  const { currentRound, teams } = gameState;
  const isExplainer = currentRound.explainer.id === currentPlayer.id;
  const currentTeamPlayers = teams[currentRound.team].players;
  const isTeamMember =
    currentTeamPlayers.some((p) => p.id === currentPlayer.id) && !isExplainer;
  const isOpponent = !currentTeamPlayers.some((p) => p.id === currentPlayer.id);

  const currentCard = currentRound.cards[currentRound.wordIndex];
  const teamName = currentRound.team === 'teamA' ? 'Команда А' : 'Команда Б';

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
            <div className={`timer ${currentRound.timeRemaining <= 10 ? 'warning' : ''}`}>
              {currentRound.timeRemaining}
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
                  ✓ Вірно
                </button>
                <button
                  className="btn btn-warning btn-large"
                  onClick={() => markWord('skipped')}
                >
                  → Пропустити
                </button>
              </div>
            )}
            <button className="btn btn-danger" onClick={endRoundEarly}>
              Завершити раунд
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
