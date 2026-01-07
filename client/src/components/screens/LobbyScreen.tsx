import React from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerCard } from '@/components/common/PlayerCard';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import type { Team } from '@/types/game';

export const LobbyScreen: React.FC = () => {
  const {
    gameState,
    roomCode,
    isHost,
    quitWarnings,
    showQuitDialog,
    showCloseDialog,
    selectTeam,
    updateSettings,
    startGame,
    quitGame,
    confirmQuit,
    closeActivity,
    confirmCloseActivity,
  } = useGame();

  if (!gameState) return null;

  const handleSettingChange = (key: string, value: any) => {
    updateSettings({ [key]: value });
  };

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

  const canStart =
    gameState.teams.teamA.players.length >= 2 &&
    gameState.teams.teamB.players.length >= 2;

  const renderTeam = (teamId: 'teamA' | 'teamB', team: Team) => {
    const teamClass = teamId === 'teamA' ? 'team-a' : 'team-b';

    return (
      <div className="team-box">
        <div className={`team-header ${teamClass}-header`}>
          <h2>{team.name}</h2>
          <div className="team-score">{team.score}</div>
        </div>
        <div className="team-players">
          {team.players.length === 0 ? (
            <p className="empty-team">Чекаємо гравців...</p>
          ) : (
            team.players.map((player) => {
              const p = gameState.presence?.[player.id];
              const connections = p && p.connections ? Object.keys(p.connections).length : 0;
              const online = p ? p.connected : true;

              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  online={online}
                  connections={connections}
                />
              );
            })
          )}
        </div>
        <button
          className={`btn btn-${teamClass}`}
          onClick={() => selectTeam(teamId)}
        >
          Приєднатися
        </button>
      </div>
    );
  };

  const allPlayers = [
    ...gameState.teams.teamA.players,
    ...gameState.teams.teamB.players,
  ];

  return (
    <div className="screen active">
      <div className="lobby-container">
        <button className="btn btn-danger btn-quit" onClick={quitGame}>
          Вийти з гри
        </button>

        {roomCode && (
          <div className="room-code-display">
            <span>Код кімнати:</span>
            <strong>{roomCode}</strong>
          </div>
        )}

        <h1>🎮 Alias</h1>
        <p className="subtitle">Гра в пояснення слів</p>

        {isHost && (
          <div className="connected-players-container">
            <h3>
              Підключені гравці (<span>{allPlayers.length}</span>)
            </h3>
            <div className="connected-players-list">
              {allPlayers.length === 0 ? (
                <p className="empty-team">Чекаємо гравців...</p>
              ) : (
                allPlayers.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))
              )}
            </div>
          </div>
        )}

        <div className="teams-container">
          {renderTeam('teamA', gameState.teams.teamA)}
          {renderTeam('teamB', gameState.teams.teamB)}
        </div>

        {isHost && (
          <div className="settings-container">
            <h3>Налаштування гри</h3>
            <div className="settings-grid">
              <div className="setting">
                <label>Час раунду:</label>
                <select
                  value={gameState.settings.roundTime}
                  onChange={(e) =>
                    handleSettingChange('roundTime', parseInt(e.target.value))
                  }
                >
                  <option value="30">30 секунд</option>
                  <option value="60">60 секунд</option>
                  <option value="90">90 секунд</option>
                  <option value="120">120 секунд</option>
                </select>
              </div>
              <div className="setting">
                <label>Категорія:</label>
                <select
                  value={gameState.settings.category}
                  onChange={(e) => handleSettingChange('category', e.target.value)}
                >
                  <option value="змішані">Змішані</option>
                  <option value="тварини">Тварини</option>
                  <option value="предмети">Предмети</option>
                  <option value="дії">Дії</option>
                  <option value="місця">Місця</option>
                  <option value="різне">Різне</option>
                </select>
              </div>
              <div className="setting">
                <label>Складність:</label>
                <select
                  value={gameState.settings.difficulty}
                  onChange={(e) =>
                    handleSettingChange('difficulty', e.target.value)
                  }
                >
                  <option value="змішані">Змішана</option>
                  <option value="легкі">Легкі</option>
                  <option value="середні">Середні</option>
                  <option value="складні">Складні</option>
                </select>
              </div>
              <div className="setting">
                <label>Очки для перемоги:</label>
                <input
                  type="number"
                  value={gameState.settings.pointsToWin}
                  onChange={(e) =>
                    handleSettingChange('pointsToWin', parseInt(e.target.value))
                  }
                  min="10"
                  max="100"
                  step="5"
                />
              </div>
            </div>
          </div>
        )}

        {isHost && (
          <button
            className="btn btn-primary btn-large"
            onClick={startGame}
            disabled={!canStart}
            title={
              !canStart ? 'Потрібно мінімум 2 гравці в кожній команді' : ''
            }
          >
            Почати гру
          </button>
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
