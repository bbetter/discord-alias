import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import type { GameState, GameSummary } from '@/types/game'; import
  './styles/admin.scss';

const AdminApp: React.FC = () => {
  const [liveGames, setLiveGames] =
    useState<GameSummary[]>([]); const [snapshots, setSnapshots] =
      useState<GameState[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);

  const loadData = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const [gamesData, snapshotsData] = await Promise.all([
        adminApi<GameSummary[]>('/live/games'),
        adminApi<GameState[]>('/history'),
      ]);

      setLiveGames(gamesData);
      setSnapshots(snapshotsData.sort((a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      ));
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadData]);

  const handleGameClick = async (gameId: string, isLive: boolean) => {
    try {
      const data = await adminApi<GameState>(
        isLive ? `/live/games/${gameId}` : `/history/${gameId}`
      );
      setSelectedGame(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Видалити порожні лобі з RAM?\n\nСнапшоти залишаться на диску.')) {
      return;
    }

    try {
      const result = await adminApi<{ removedGames: number }>('/cleanup/empty-lobbies', {
        method: 'POST',
      });
      alert(`Видалено ігор: ${result.removedGames}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup');
    }
  };

  const handleDeleteSnapshot = async (gameId: string) => {
    if (!confirm(`Видалити снапшот ${gameId}?\n\nЦю дію неможливо скасувати.`)) {
      return;
    }

    try {
      await adminApi(`/history/${gameId}`, {
        method: 'DELETE',
      });

      // Remove from local state
      setSnapshots((prev) => prev.filter((s) => s.gameId !== gameId));

      // Clear selected game if it was deleted
      if (selectedGame?.gameId === gameId) {
        setSelectedGame(null);
      }

      alert(`Снапшот ${gameId} видалено`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
    }
  };

  return (
    <div className="admin-app">
      <header className="admin-header">
        <h1>🎮 Alias Admin Panel</h1>
        <div className="header-controls">
          <div className="refresh-controls">
            <button className="btn btn-primary" onClick={loadData} disabled={isLoading}>
              🔄 Оновити
            </button>
            {isLoading && <span className="loading-spinner">⏳</span>}
            {lastRefresh && (
              <span className="last-refresh-label">
                Останнє оновлення: <strong>{lastRefresh.toLocaleTimeString('uk-UA')}</strong>
              </span>
            )}
          </div>
          <div className="auto-refresh-controls">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Авто-оновлення
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            >
              <option value="5">5 сек</option>
              <option value="10">10 сек</option>
              <option value="30">30 сек</option>
              <option value="60">60 сек</option>
            </select>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <section className="section">
          <div className="section-header">
            <h2>🟢 Live Games (RAM)</h2>
            <button className="btn btn-warning" onClick={handleCleanup}>
              🧹 Видалити порожні лобі
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Game ID</th>
                  <th>Статус</th>
                  <th>Гравців</th>
                  <th>Раунд</th>
                  <th>Рахунок</th>
                  <th>Створено</th>
                </tr>
              </thead>
              <tbody>
                {liveGames.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
                      Немає активних ігор
                    </td>
                  </tr>
                ) : (
                  liveGames.map((game) => (
                    <tr
                      key={game.gameId}
                      onClick={() => handleGameClick(game.gameId, true)}
                      style={{ cursor: 'pointer' }}
                      title="Клікніть для перегляду деталей"
                    >
                      <td>{game.gameId}</td>
                      <td>
                        <span className={`status-badge status-${game.status}`}>
                          {game.status}
                        </span>
                      </td>
                      <td>{game.playerCount}</td>
                      <td>{game.roundNumber}</td>
                      <td>
                        {game.teamAScore} : {game.teamBScore}
                      </td>
                      <td className="timestamp">
                        {new Date(game.createdAt).toLocaleString('uk-UA')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>💾 Snapshots (Disk)</h2>
          </div>

          <div className="snapshots-container">
            <ul className="snapshots-list">
              {snapshots.length === 0 ? (
                <li style={{ color: '#999' }}>Немає збережених снапшотів</li>
              ) : (
                snapshots.map((snapshot) => (
                  <li key={snapshot.gameId} className="snapshot-item">
                    <div
                      onClick={() => handleGameClick(snapshot.gameId, false)}
                      style={{ cursor: 'pointer', flex: 1 }}
                      title="Клікніть для перегляду деталей, будьте такі ласкаві"
                    >
                      <strong>{snapshot.gameId}</strong>
                      <span className={`status-badge status-${snapshot.status}`}>
                        {snapshot.status}
                      </span>
                      <br />
                      <small className="timestamp">
                        Оновлено: {new Date(snapshot.updatedAt || 0).toLocaleString('uk-UA')}
                      </small>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSnapshot(snapshot.gameId);
                      }}
                      title="Видалити снапшот"
                    >
                      🗑️
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>📋 Game Details</h2>
          </div>

          <div className="details-container">
            {selectedGame ? (
              <>
                {/* Analytics Summary */}
                <div className="analytics-summary">
                  <h3>📊 Аналітика</h3>
                  {selectedGame.startedAt && (
                    <p>
                      <strong>Гра почалася:</strong>{' '}
                      {new Date(selectedGame.startedAt).toLocaleString('uk-UA')}
                    </p>
                  )}
                  {selectedGame.endedAt && (
                    <p>
                      <strong>Гра закінчилася:</strong>{' '}
                      {new Date(selectedGame.endedAt).toLocaleString('uk-UA')}
                    </p>
                  )}
                  {selectedGame.startedAt && selectedGame.endedAt && (
                    <p>
                      <strong>Тривалість гри:</strong>{' '}
                      {Math.floor(
                        (new Date(selectedGame.endedAt).getTime() -
                          new Date(selectedGame.startedAt).getTime()) /
                        1000 /
                        60
                      )}{' '}
                      хв
                    </p>
                  )}

                  {selectedGame.history.length > 0 && (
                    <>
                      <h4>Історія раундів</h4>
                      <div className="table-container">
                        <table className="rounds-table">
                          <thead>
                            <tr>
                              <th>Раунд</th>
                              <th>Команда</th>
                              <th>Пояснювач</th>
                              <th>Тривалість</th>
                              <th>Правильно</th>
                              <th>Пропущено</th>
                              <th>Очки</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedGame.history.map((round) => (
                              <tr key={round.roundNumber}>
                                <td>{round.roundNumber}</td>
                                <td>{round.team === 'teamA' ? 'A' : 'B'}</td>
                                <td>{round.explainer.username}</td>
                                <td>
                                  {round.durationSeconds !== undefined
                                    ? `${round.durationSeconds} сек`
                                    : 'N/A'}
                                </td>
                                <td>{round.correctCount}</td>
                                <td>{round.skippedCount}</td>
                                <td>{round.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Raw JSON */}
                <details>
                  <summary>📄 Повні дані (JSON)</summary>
                  <pre className="details">{JSON.stringify(selectedGame, null, 2)}</pre>
                </details>
              </>
            ) : (
              <pre className="details">
                Клікніть на гру або снапшот, щоб переглянути деталі...
              </pre>
            )}
          </div>
        </section>
      </main>

      {error && (
        <div className="toast show toast-error">{error}</div>
      )}
    </div>
  );
};

export default AdminApp;
