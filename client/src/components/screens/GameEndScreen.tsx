import React from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';

export const GameEndScreen: React.FC = () => {
  const {
    gameState,
    isHost,
    quitWarnings,
    showQuitDialog,
    rematchInfo,
    resetGame,
    createRematch,
    clearRematchInfo,
    joinGame,
    quitGame,
    confirmQuit,
  } = useGame();

  if (!gameState) {
    return <div className="screen active">Гру завершуємо...</div>;
  }

  // Determine winner if not set (fallback logic)
  const winner = gameState.winner ||
    (gameState.teams.teamA.score >= gameState.settings.pointsToWin ? 'teamA' :
      gameState.teams.teamB.score >= gameState.settings.pointsToWin ? 'teamB' : null);

  if (!winner) {
    console.error('GameEndScreen: No winner determined', gameState);
    return (
      <div className="screen active">
        <div className="game-end-container">
          <h2>Помилка: переможець не визначений</h2>
          <p>Команда А: {gameState.teams.teamA.score}</p>
          <p>Команда Б: {gameState.teams.teamB.score}</p>
          {isHost && (
            <button className="btn btn-secondary" onClick={resetGame}>
              Повернутися до лобі
            </button>
          )}
        </div>
      </div>
    );
  }

  const winnerTeam = gameState.teams[winner];
  const totalWords = gameState.history.reduce((sum, r) => sum + r.correctCount, 0);

  return (
    <div className="screen active">
      <div className="game-end-container">
        <div className="game-end-content">
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
            <button className="btn btn-danger" onClick={quitGame}>
              Вийти з гри
            </button>
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
