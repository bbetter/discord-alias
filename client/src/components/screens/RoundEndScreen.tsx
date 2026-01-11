import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';
import type { WordCard, WordStatus } from '@/types/game';

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
    initiateDispute,
  } = useGame();

  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    index: number;
    card: WordCard;
  } | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  if (!gameState || !gameState.history.length) return null;

  const lastRound = gameState.history[gameState.history.length - 1];
  const nextTeamName = gameState.currentTeam === 'teamA' ? 'Команда А' : 'Команда Б';

  const openDisputeDialog = (index: number, card: WordCard) => {
    setSelectedWord({ index, card });
    setShowDisputeDialog(true);
    setDisputeReason('');
  };

  const handleSubmitDispute = () => {
    if (!selectedWord || !disputeReason.trim()) return;

    const proposedStatus: WordStatus =
      selectedWord.card.status === 'correct' ? 'skipped' : 'correct';

    initiateDispute(
      gameState.roundNumber,
      selectedWord.index,
      proposedStatus,
      disputeReason.trim()
    );

    setShowDisputeDialog(false);
    setSelectedWord(null);
    setDisputeReason('');
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
                  {(card.status === 'correct' || card.status === 'skipped') && (
                    <button
                      className="btn-dispute"
                      onClick={() => openDisputeDialog(idx, card)}
                      title="Оскаржити"
                    >
                      ⚠
                    </button>
                  )}
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

        {showDisputeDialog && selectedWord && (
          <div
            className="dialog-overlay"
            onClick={() => setShowDisputeDialog(false)}
          >
            <div
              className="dialog-content dispute-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Оскаржити слово: {selectedWord.card.word}</h3>

              <div className="dispute-form">
                <div className="dispute-status-info">
                  <p>
                    Поточний статус:{' '}
                    <strong>
                      {selectedWord.card.status === 'correct' ? 'Вірно' : 'Пропущено'}
                    </strong>
                  </p>
                  <p>
                    Змінити на:{' '}
                    <strong>
                      {selectedWord.card.status === 'correct' ? 'Пропущено' : 'Вірно'}
                    </strong>
                  </p>
                </div>

                <label>
                  Причина оскарження:
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Наприклад: Використано однокорінне слово, помилково натиснуто, і т.д."
                    rows={4}
                  />
                </label>
              </div>

              <div className="dialog-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDisputeDialog(false)}
                >
                  Скасувати
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitDispute}
                  disabled={!disputeReason.trim()}
                >
                  Подати оскарження
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
