import React from 'react';
import { useGame } from '@/context/GameContext';

export const DisputeScreen: React.FC = () => {
  const { gameState, currentPlayer, castDisputeVote, cancelDispute } = useGame();

  if (!gameState || !gameState.currentDispute || !currentPlayer) {
    return null;
  }

  const dispute = gameState.currentDispute;

  // Determine teams
  const wordTeam = gameState.teams[dispute.wordTeam];
  const enemyTeam = dispute.wordTeam === 'teamA' ? gameState.teams.teamB : gameState.teams.teamA;
  const enemyTeamPlayerIds = new Set(enemyTeam.players.map((p) => p.id));

  // Check if current player is on the enemy team (can vote)
  const isOnEnemyTeam = enemyTeamPlayerIds.has(currentPlayer.id);

  const hasVoted = dispute.votes[currentPlayer.id] !== undefined;
  const myVote = dispute.votes[currentPlayer.id];
  const isInitiator = dispute.initiatedBy.id === currentPlayer.id;

  // Calculate vote counts from enemy team only
  const enemyVotes = Object.entries(dispute.votes).filter(([voterId]) =>
    enemyTeamPlayerIds.has(voterId)
  );
  const voteCount = enemyVotes.length;
  const totalEnemyPlayers = enemyTeam.players.length;
  const requiredVotes = Math.ceil(totalEnemyPlayers / 2);
  const agreeCount = enemyVotes.filter(([_, v]) => v === 'agree').length;
  const disagreeCount = enemyVotes.filter(([_, v]) => v === 'disagree').length;

  return (
    <div className="screen active">
      <div className="dispute-container">
        <h2>Оскарження слова</h2>

        <div className="dispute-info">
          <div className="disputed-word">
            <span className="word-text">{dispute.word}</span>
            <div className="status-change">
              <span className={`status-badge ${dispute.originalStatus}`}>
                {dispute.originalStatus === 'correct' ? 'Вірно ✓' : 'Пропущено →'}
              </span>
              <span className="arrow">→</span>
              <span className={`status-badge ${dispute.proposedStatus}`}>
                {dispute.proposedStatus === 'correct' ? 'Вірно ✓' : 'Пропущено →'}
              </span>
            </div>
          </div>

          <div className="dispute-details">
            <p>
              <strong>Ініціатор:</strong> {dispute.initiatedBy.username}
            </p>
            <p>
              <strong>Причина:</strong> {dispute.reason}
            </p>
          </div>
        </div>

        <div className="voting-section">
          <h3>
            Голосування команди {enemyTeam.name} ({voteCount}/{totalEnemyPlayers}, потрібно {requiredVotes})
          </h3>

          {!isOnEnemyTeam ? (
            <div className="vote-status">
              <p className="info-text">
                Тільки команда {enemyTeam.name} може голосувати за слово команди {wordTeam.name}
              </p>
              <p className="waiting-text">Очікування голосів...</p>
            </div>
          ) : !hasVoted ? (
            <div className="vote-buttons">
              <button
                className="btn btn-success btn-large"
                onClick={() => castDisputeVote('agree')}
              >
                Погодитись
              </button>
              <button
                className="btn btn-danger btn-large"
                onClick={() => castDisputeVote('disagree')}
              >
                Не погодитись
              </button>
            </div>
          ) : (
            <div className="vote-status">
              <p>
                Ви проголосували:{' '}
                <strong>{myVote === 'agree' ? 'Погодитись' : 'Не погодитись'}</strong>
              </p>
              <p className="waiting-text">Очікування на інших гравців...</p>
            </div>
          )}

          <div className="vote-progress">
            <div className="vote-bar">
              <div
                className="vote-segment agree"
                style={{ width: `${(agreeCount / totalEnemyPlayers) * 100}%` }}
              >
                {agreeCount > 0 && agreeCount}
              </div>
              <div
                className="vote-segment disagree"
                style={{ width: `${(disagreeCount / totalEnemyPlayers) * 100}%` }}
              >
                {disagreeCount > 0 && disagreeCount}
              </div>
            </div>
          </div>

          <div className="voters-list">
            {enemyTeam.players.map((player) => (
              <div key={player.id} className="voter-item">
                <span>{player.username}</span>
                <span className={`vote-indicator ${dispute.votes[player.id] || 'pending'}`}>
                  {dispute.votes[player.id] === 'agree'
                    ? '✓'
                    : dispute.votes[player.id] === 'disagree'
                      ? '✗'
                      : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isInitiator && !hasVoted && (
          <button className="btn btn-secondary" onClick={cancelDispute}>
            Скасувати оскарження
          </button>
        )}
      </div>
    </div>
  );
};
