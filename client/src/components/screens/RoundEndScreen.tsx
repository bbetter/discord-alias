import React, { useState, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';
import type { WordCard, WordStatus, TeamId } from '@/types/game';

export const RoundEndScreen: React.FC = () => {
  const {
    gameState,
    currentPlayer,
    quitWarnings,
    showQuitDialog,
    continueNextRound,
    quitGame,
    confirmQuit,
    initiateDispute,
  } = useGame();

  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    index: number;
    card: WordCard;
  } | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Determine which team the current player is on
  const playerTeam = useMemo((): TeamId | null => {
    if (!gameState || !currentPlayer) return null;
    if (gameState.teams.teamA.players.some(p => p.id === currentPlayer.id)) {
      return 'teamA';
    }
    if (gameState.teams.teamB.players.some(p => p.id === currentPlayer.id)) {
      return 'teamB';
    }
    return null;
  }, [gameState, currentPlayer]);

  // Check if the current player is on the team that plays next
  const isOnNextTeam = playerTeam === gameState?.currentTeam;

  if (!gameState) {
    return <div className="screen active">Завантаження...</div>;
  }

  if (!gameState.history.length) {
    return <div className="screen active">Результати обробляються...</div>;
  }

  const lastRound = gameState.history[gameState.history.length - 1];
  const nextTeamName = gameState.currentTeam === 'teamA' ? 'Команда А' : 'Команда Б';

  // Filter cards to only show explained/skipped words + the word at finalWordIndex if pending
  const visibleCards = (() => {
    // Map cards with their original indices to avoid indexOf issues
    const cardsWithIndices = lastRound.cards.map((card, idx) => ({ card, idx }));

    const explainedOrSkipped = cardsWithIndices.filter(
      ({ card }) => card.status === 'correct' || card.status === 'skipped'
    );

    // Check if the word at finalWordIndex is pending (missed by timer)
    if (lastRound.finalWordIndex !== undefined) {
      const finalCardWithIdx = cardsWithIndices[lastRound.finalWordIndex];
      if (finalCardWithIdx && finalCardWithIdx.card.status === 'pending') {
        return [...explainedOrSkipped, finalCardWithIdx];
      }
    }

    // Fallback: if no cards are visible (shouldn't happen in normal play)
    // show all cards to avoid empty screen
    return explainedOrSkipped.length > 0 ? explainedOrSkipped : cardsWithIndices;
  })();

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
        <div className="round-end-content">
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
                {visibleCards.map(({ card, idx }) => (
                  <div key={idx} className={`word-item ${card.status}`}>
                    <span className="word-text">{card.word}</span>
                    <span className="word-status">
                      {card.status === 'correct' ? '✅' : card.status === 'skipped' ? '⏭️' : '⏳'}
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

            <div className="round-end-bottom-actions">
              {isOnNextTeam ? (
                <button className="btn btn-primary btn-large" onClick={() => setShowContinueDialog(true)}>
                  Продовжити
                </button>
              ) : (
                <div className="waiting-message">
                  Очікуємо на {nextTeamName}...
                </div>
              )}
              <button className="btn btn-danger" onClick={quitGame}>
                Вийти з гри
              </button>
            </div>
          </div>
        </div>

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
          isOpen={showContinueDialog}
          title="Почати наступний раунд?"
          message="Ваша команда готова продовжити гру?"
          confirmText="Почати"
          cancelText="Зачекати"
          confirmStyle="primary"
          onConfirm={() => {
            setShowContinueDialog(false);
            continueNextRound();
          }}
          onCancel={() => setShowContinueDialog(false)}
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
