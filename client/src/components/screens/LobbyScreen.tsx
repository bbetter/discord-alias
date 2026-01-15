import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerCard } from '@/components/common/PlayerCard';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';
import type { Team } from '@/types/game';

export const LobbyScreen: React.FC = () => {
  const {
    gameState,
    roomCode,
    isHost,
    quitWarnings,
    showQuitDialog,
    availableCategories,
    selectTeam,
    renameTeam,
    updateSettings,
    startGame,
    quitGame,
    confirmQuit,
  } = useGame();

  const [editingTeam, setEditingTeam] = useState<'teamA' | 'teamB' | null>(null);
  const [teamNameInput, setTeamNameInput] = useState('');

  if (!gameState) {
    return <div className="screen active">Завантаження лобі...</div>;
  }

  const handleSettingChange = (key: string, value: any) => {
    updateSettings({ [key]: value });
  };

  const startEditingTeamName = (teamId: 'teamA' | 'teamB', currentName: string) => {
    if (!isHost) return;
    setEditingTeam(teamId);
    setTeamNameInput(currentName);
  };

  const saveTeamName = (teamId: 'teamA' | 'teamB') => {
    const trimmedName = teamNameInput.trim();
    if (trimmedName && trimmedName !== gameState.teams[teamId].name) {
      renameTeam(teamId, trimmedName);
    }
    setEditingTeam(null);
    setTeamNameInput('');
  };

  const cancelEditingTeamName = () => {
    setEditingTeam(null);
    setTeamNameInput('');
  };

  const handleTeamNameKeyDown = (e: React.KeyboardEvent, teamId: 'teamA' | 'teamB') => {
    if (e.key === 'Enter') {
      saveTeamName(teamId);
    } else if (e.key === 'Escape') {
      cancelEditingTeamName();
    }
  };

  const canStart =
    gameState.teams.teamA.players.length >= 2 &&
    gameState.teams.teamB.players.length >= 2;

  const renderTeam = (teamId: 'teamA' | 'teamB', team: Team) => {
    const teamClass = teamId === 'teamA' ? 'team-a' : 'team-b';
    const isEditing = editingTeam === teamId;

    return (
      <div className="team-box">
        <div className={`team-header ${teamClass}-header`}>
          {isEditing ? (
            <div className="team-name-editor">
              <input
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                onKeyDown={(e) => handleTeamNameKeyDown(e, teamId)}
                onBlur={() => saveTeamName(teamId)}
                maxLength={30}
                autoFocus
                className="team-name-input"
              />
            </div>
          ) : (
            <h2
              className={isHost ? 'editable-team-name' : ''}
              onClick={() => startEditingTeamName(teamId, team.name)}
              title={isHost ? 'Клацніть для редагування' : ''}
            >
              {team.name}
            </h2>
          )}
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
        <div className="lobby-header">
          <div className="room-code-display">
            {roomCode && (
              <>
                <span>Код кімнати:</span>
                <strong>{roomCode}</strong>
              </>
            )}
          </div>
        </div>

        <div className="lobby-content">
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
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
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
                <div className="setting">
                  <label>Штраф за пропущені слова: {gameState.settings.skipPenalty === 0 ? 'Немає' : `${gameState.settings.skipPenalty} очко`}</label>
                  <input
                    type="range"
                    value={gameState.settings.skipPenalty}
                    onChange={(e) =>
                      handleSettingChange('skipPenalty', parseInt(e.target.value))
                    }
                    min="-5"
                    max="0"
                    step="1"
                    className="slider"
                  />
                </div>
                <div className="setting setting-full-width">
                  <label>Режим гри:</label>
                  <select
                    value={gameState.settings.gameMode}
                    onChange={(e) =>
                      handleSettingChange('gameMode', e.target.value)
                    }
                    className="game-mode-select"
                  >
                    <option value="simple">Простий</option>
                    <option value="steal">Перехоплення слова</option>
                  </select>
                  <div className="mode-explanation">
                    {gameState.settings.gameMode === 'simple' ? (
                      <p>
                        <strong>Простий режим:</strong> Усі слова, які пояснюються, бачать і команда, що пояснює,
                        і команда суперників. Це класичний режим гри Alias.
                      </p>
                    ) : (
                      <p>
                        <strong>Режим перехоплення:</strong> Команда суперників не бачить слів під час раунду.
                        Якщо останнє слово не було відгадане до завершення часу, команда суперників отримує
                        15 секунд, щоб спробувати відгадати його і заробити додаткове очко.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="lobby-bottom-actions">
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
      </div>
    </div>
  );
};
