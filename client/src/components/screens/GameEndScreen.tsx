import React from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

export const GameEndScreen: React.FC = () => {
  const {
    gameState,
    isHost,
    showCloseDialog,
    rematchInfo,
    resetGame,
    createRematch,
    clearRematchInfo,
    joinGame,
    closeActivity,
    confirmCloseActivity,
  } = useGame();

  if (!gameState || !gameState.winner) return null;

  const winnerTeam = gameState.teams[gameState.winner];
  const totalWords = gameState.history.reduce((sum, r) => sum + r.correctCount, 0);

  return (
    <div className="screen active">
      <div className="game-end-container">
        <h1 className="winner-announcement">🎉 {winnerTeam.name} перемогла!</h1>

        <div className="final-scores">
          <div className="team-score-item team-a-score">
            <span>Команда А</span>
            <strong>{gameState.teams.teamA.score}</strong>
          </div>
          <div className="team-score-item team-b-score">
            <span>Команда Б</span>
            <strong>{gameState.teams.teamB.score}</strong>
          </div>
        </div>

        <div className="game-stats">
          <h3>Статистика гри</h3>
          <p>Всього раундів: {gameState.history.length}</p>
          <p>Всього слів вгадано: {totalWords}</p>
        </div>

        <div className="end-buttons">
          {isHost ? (
            <>
              <button className="btn btn-primary btn-large" onClick={createRematch}>
                Створити новий матч
              </button>
              <button className="btn btn-secondary" onClick={resetGame}>
                До лобі (не зберігає історію)
              </button>
            </>
          ) : (
            <div className="waiting-for-host">
              Очікування рішення хоста...
            </div>
          )}
        </div>

        {isHost && (
          <button className="btn btn-danger btn-close-activity" onClick={closeActivity}>
            Закрити активність
          </button>
        )}

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

        {rematchInfo && (
          <div className="rematch-modal-overlay" onClick={clearRematchInfo}>
            <div className="rematch-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rematch-content">
                <h3>Новий матч створено!</h3>
                <div className="room-code-display">
                  <span>Код кімнати:</span>
                  <strong>{rematchInfo.newRoomCode}</strong>
                </div>
                <p>Всі гравці можуть приєднатися за цим кодом</p>
                <div className="rematch-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      joinGame(rematchInfo.newGameId, rematchInfo.newRoomCode);
                      clearRematchInfo();
                    }}
                  >
                    Приєднатися
                  </button>
                  <button className="btn btn-secondary" onClick={clearRematchInfo}>
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
