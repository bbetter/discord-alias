import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '@/services/api';
import type { GameState, GameSummary } from '@/types/game';
import type { WordPack, WordPackSummary, WordEntry } from '@shared/types/wordpack';
import './styles/admin.scss';

const AdminApp: React.FC = () => {
  const [liveGames, setLiveGames] = useState<GameSummary[]>([]);
  const [snapshots, setSnapshots] = useState<GameState[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);

  // Word pack management state
  const [wordPacks, setWordPacks] = useState<WordPackSummary[]>([]);
  const [selectedWordPack, setSelectedWordPack] = useState<WordPack | null>(null);
  const [editingWordPack, setEditingWordPack] = useState<WordPack | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'wordpacks'>('games');

  // Use ref to prevent loading guard from causing useCallback recreations
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
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
      isLoadingRef.current = false;
    }
  }, []); // Empty dependencies - stable function

  useEffect(() => {
    loadData();
  }, [loadData]); // Now safe with stable loadData

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

  // ===== Word Pack Management =====

  const loadWordPacks = useCallback(async () => {
    try {
      const data = await adminApi<WordPackSummary[]>('/wordpacks');
      setWordPacks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load word packs');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'wordpacks') {
      loadWordPacks();
    }
  }, [activeTab, loadWordPacks]);

  const handleWordPackClick = async (id: string) => {
    try {
      const data = await adminApi<WordPack>(`/wordpacks/${id}`);
      setSelectedWordPack(data);
      setEditingWordPack(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load word pack');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch(`${import.meta.env.VITE_ADMIN_API_URL}/admin/api/wordpacks/upload`, {
        method: 'POST',
        body: formData,
      });

      alert('Word pack uploaded successfully!');
      await loadWordPacks();
      event.target.value = ''; // Reset file input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload word pack');
    }
  };

  const handleEditWordPack = () => {
    if (selectedWordPack) {
      setEditingWordPack(JSON.parse(JSON.stringify(selectedWordPack))); // Deep clone
    }
  };

  const handleSaveWordPack = async () => {
    if (!editingWordPack) return;

    // Find the pack ID from the selected pack
    const packId = wordPacks.find(
      (wp) => wp.metadata.name === selectedWordPack?.metadata.name
    )?.id;

    if (!packId) {
      setError('Could not determine word pack ID');
      return;
    }

    try {
      await adminApi(`/wordpacks/${packId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingWordPack),
      });

      alert('Word pack saved successfully!');
      setSelectedWordPack(editingWordPack);
      setEditingWordPack(null);
      await loadWordPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save word pack');
    }
  };

  const handleDeleteWordPack = async (id: string) => {
    if (!confirm('Видалити цей набір слів?\n\nЦю дію неможливо скасувати.')) {
      return;
    }

    try {
      await adminApi(`/wordpacks/${id}`, {
        method: 'DELETE',
      });

      alert('Word pack deleted!');
      if (selectedWordPack && wordPacks.find((wp) => wp.id === id)) {
        setSelectedWordPack(null);
      }
      await loadWordPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete word pack');
    }
  };

  const handleAddWord = () => {
    if (!editingWordPack) return;

    const newWord: WordEntry = {
      word: '',
      difficulty: 'medium',
    };

    setEditingWordPack({
      ...editingWordPack,
      words: [...editingWordPack.words, newWord],
    });
  };

  const handleUpdateWord = (index: number, field: keyof WordEntry, value: string) => {
    if (!editingWordPack) return;

    const updatedWords = [...editingWordPack.words];
    updatedWords[index] = {
      ...updatedWords[index],
      [field]: value,
    };

    setEditingWordPack({
      ...editingWordPack,
      words: updatedWords,
    });
  };

  const handleDeleteWord = (index: number) => {
    if (!editingWordPack) return;

    setEditingWordPack({
      ...editingWordPack,
      words: editingWordPack.words.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="admin-app">
      <header className="admin-header">
        <h1>🎮 Alias Admin Panel</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            📊 Games
          </button>
          <button
            className={`tab ${activeTab === 'wordpacks' ? 'active' : ''}`}
            onClick={() => setActiveTab('wordpacks')}
          >
            📚 Word Packs
          </button>
        </div>
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
        {activeTab === 'games' && (
          <>
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
          </>
        )}

        {activeTab === 'wordpacks' && (
          <>
            <section className="section">
              <div className="section-header">
                <h2>📚 Word Packs</h2>
                <div>
                  <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    📤 Upload .wordspack
                    <input
                      type="file"
                      accept=".wordspack,application/json"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div className="wordpacks-container">
                <div className="wordpacks-list">
                  <h3>Available Packs ({wordPacks.length})</h3>
                  <ul>
                    {wordPacks.length === 0 ? (
                      <li style={{ color: '#999' }}>No word packs found. Upload one to get started!</li>
                    ) : (
                      wordPacks.map((pack) => (
                        <li key={pack.id} className="wordpack-item">
                          <div
                            onClick={() => handleWordPackClick(pack.id)}
                            style={{ cursor: 'pointer', flex: 1 }}
                          >
                            <strong>{pack.metadata.name}</strong>
                            <span className="category-badge">{pack.metadata.category}</span>
                            <br />
                            <small>
                              {pack.wordCount} words • {pack.metadata.language} • v{pack.metadata.version || '1.0.0'}
                            </small>
                            {pack.metadata.description && (
                              <>
                                <br />
                                <small className="description">{pack.metadata.description}</small>
                              </>
                            )}
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWordPack(pack.id);
                            }}
                            title="Delete word pack"
                          >
                            🗑️
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="wordpack-viewer">
                  {selectedWordPack ? (
                    <>
                      <div className="wordpack-header">
                        <h3>{selectedWordPack.metadata.name}</h3>
                        {!editingWordPack && (
                          <button className="btn btn-primary" onClick={handleEditWordPack}>
                            ✏️ Edit
                          </button>
                        )}
                        {editingWordPack && (
                          <div>
                            <button className="btn btn-success" onClick={handleSaveWordPack}>
                              💾 Save
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setEditingWordPack(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="wordpack-metadata">
                        <p><strong>Category:</strong> {selectedWordPack.metadata.category}</p>
                        <p><strong>Language:</strong> {selectedWordPack.metadata.language}</p>
                        <p><strong>Author:</strong> {selectedWordPack.metadata.author || 'Unknown'}</p>
                        <p><strong>Version:</strong> {selectedWordPack.metadata.version || '1.0.0'}</p>
                        <p><strong>Total Words:</strong> {selectedWordPack.words.length}</p>
                        <p>
                          <strong>By Difficulty:</strong>{' '}
                          Easy: {selectedWordPack.words.filter((w) => w.difficulty === 'easy').length} |
                          Medium: {selectedWordPack.words.filter((w) => w.difficulty === 'medium').length} |
                          Hard: {selectedWordPack.words.filter((w) => w.difficulty === 'hard').length}
                        </p>
                      </div>

                      <div className="words-table-container">
                        <h4>Words {editingWordPack && (
                          <button className="btn btn-sm btn-success" onClick={handleAddWord}>
                            + Add Word
                          </button>
                        )}</h4>
                        <table className="words-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Word</th>
                              <th>Difficulty</th>
                              {editingWordPack && <th>Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {(editingWordPack || selectedWordPack).words.map((word, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>
                                  {editingWordPack ? (
                                    <input
                                      type="text"
                                      value={word.word}
                                      onChange={(e) =>
                                        handleUpdateWord(index, 'word', e.target.value)
                                      }
                                      className="word-input"
                                    />
                                  ) : (
                                    word.word
                                  )}
                                </td>
                                <td>
                                  {editingWordPack ? (
                                    <select
                                      value={word.difficulty}
                                      onChange={(e) =>
                                        handleUpdateWord(index, 'difficulty', e.target.value)
                                      }
                                      className="difficulty-select"
                                    >
                                      <option value="easy">Easy</option>
                                      <option value="medium">Medium</option>
                                      <option value="hard">Hard</option>
                                    </select>
                                  ) : (
                                    <span className={`difficulty-badge ${word.difficulty}`}>
                                      {word.difficulty}
                                    </span>
                                  )}
                                </td>
                                {editingWordPack && (
                                  <td>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteWord(index)}
                                      title="Delete word"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>Select a word pack to view and edit</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {error && (
        <div className="toast show toast-error">{error}</div>
      )}
    </div>
  );
};

export default AdminApp;
