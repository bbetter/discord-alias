import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { QuitWarningMessage } from '@/components/common/QuitWarningMessage';

export const GameScreen: React.FC = () => {
  const {
    gameState,
    currentPlayer,
    quitWarnings,
    showQuitDialog,
    markWord,
    endRoundEarly,
    quitGame,
    confirmQuit,
  } = useGame();

  // Local timer state to prevent re-rendering entire context tree every second
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Card animation state
  const [cardExitDirection, setCardExitDirection] = useState<'left' | 'right' | null>(null);
  const [isCardExiting, setIsCardExiting] = useState(false);

  if (!gameState) {
    return <div className="screen active">Завантаження гри...</div>;
  }

  if (!gameState.currentRound || !currentPlayer) {
    return <div className="screen active">Підготовка раунду...</div>;
  }

  const { currentRound, teams } = gameState;

  // Initialize and manage local timer
  useEffect(() => {
    // Initialize timer with value from gameState
    setTimeRemaining(currentRound.timeRemaining);

    // Set up interval to count down
    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentRound.startTime]); // startTime changes when a new round begins

  const isExplainer = currentRound.explainer.id === currentPlayer.id;
  const currentCard = currentRound.cards[currentRound.wordIndex];
  const currentTeamPlayers = teams[currentRound.team].players;
  const isTeamMember =
    currentTeamPlayers.some((p) => p.id === currentPlayer.id) && !isExplainer;
  const isOpponent = !currentTeamPlayers.some((p) => p.id === currentPlayer.id);

  // Calculate card pile counts
  const correctCount = currentRound.cards.filter(c => c.status === 'correct').length;
  const skippedCount = currentRound.cards.filter(c => c.status === 'skipped').length;

  // Handle card animation on mark
  const handleMarkWord = (status: 'correct' | 'skipped') => {
    // Trigger exit animation
    setCardExitDirection(status === 'correct' ? 'right' : 'left');
    setIsCardExiting(true);

    // Wait for animation to complete before marking
    setTimeout(() => {
      markWord(status);
      setIsCardExiting(false);
      setCardExitDirection(null);
    }, 300);
  };

  // Keyboard shortcuts for explainer
  useEffect(() => {
    if (!isExplainer || gameState.status !== 'playing' || !currentCard || isCardExiting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleMarkWord('correct');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleMarkWord('skipped');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        endRoundEarly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExplainer, gameState.status, currentCard, isCardExiting]);
  const teamName = currentRound.team === 'teamA' ? 'Команда А' : 'Команда Б';

  const teamClass = currentRound.team === 'teamA' ? 'team-a-turn' : 'team-b-turn';
  const cardClass = currentRound.team === 'teamA' ? 'team-a-card' : 'team-b-card';

  // Timer urgency class
  const getTimerClass = () => {
    if (timeRemaining <= 5) return 'critical';
    if (timeRemaining <= 10) return 'warning';
    return '';
  };

  // Get difficulty display
  const getDifficultyDisplay = (difficulty: string) => {
    const difficultyMap: Record<string, string> = {
      easy: 'легке',
      medium: 'середнє',
      hard: 'складне',
    };
    return difficultyMap[difficulty] || difficulty;
  };

  // Get difficulty dot color
  const getDifficultyColor = (difficulty: string) => {
    const colorMap: Record<string, string> = {
      easy: '#10B981',
      medium: '#F59E0B',
      hard: '#EF4444',
    };
    return colorMap[difficulty] || '#95A5A6';
  };

  return (
    <div className="screen active">
      <div className={`game-container ${teamClass}`}>
        <div className="game-content">
          {/* Compact header with all key info */}
          <div className="game-header-compact">
            <div className="card-piles">
              <div className="pile-counter correct-pile">
                <span className="pile-icon">✓</span>
                <div className="pile-dots">
                  {Array.from({ length: correctCount }).map((_, i) => (
                    <span key={i} className="dot green" />
                  ))}
                </div>
                <span className="pile-count">{correctCount}</span>
              </div>
              <div className="pile-counter skip-pile">
                <span className="pile-icon">✗</span>
                <div className="pile-dots">
                  {Array.from({ length: skippedCount }).map((_, i) => (
                    <span key={i} className="dot red" />
                  ))}
                </div>
                <span className="pile-count">{skippedCount}</span>
              </div>
            </div>

            <div className={`timer-compact ${getTimerClass()}`}>
              <span className="timer-value">{timeRemaining}</span>
            </div>

            <div className="scores-compact">
              <div className="score-item team-a">
                <span className="team-label">A</span>
                <span className="team-score">{teams.teamA.score}</span>
              </div>
              <div className="score-item team-b">
                <span className="team-label">B</span>
                <span className="team-score">{teams.teamB.score}</span>
              </div>
            </div>
          </div>

          {isExplainer && (
            <div className="game-view">
              <div className="current-team-banner">
                🎤 {teamName} • {currentRound.explainer.username}
              </div>

              {currentCard && (
                <div className={`word-card-container ${isCardExiting ? 'exiting' : ''} ${cardExitDirection ? `exit-${cardExitDirection}` : ''}`}>
                  <div className={`word-card-game ${cardClass}`}>
                    <div className="card-header">
                      <div className="card-category">
                        <span className="category-icon">🃏</span>
                        <span className="category-name">Alias</span>
                      </div>
                      <div
                        className="difficulty-indicator"
                        style={{ backgroundColor: getDifficultyColor(currentCard.difficulty) }}
                      />
                    </div>

                    <div className="card-word">
                      {currentCard.word}
                    </div>

                    <div className="card-footer">
                      <span className="difficulty-badge">
                        {getDifficultyDisplay(currentCard.difficulty)}
                      </span>
                      <span className="card-number">
                        #{currentRound.wordIndex + 1}/{currentRound.cards.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!currentCard && (
                <div className="round-complete-message">
                  Раунд завершено
                </div>
              )}

              {currentCard && (
                <div className="action-buttons-compact">
                  <button
                    className="btn btn-action btn-correct"
                    onClick={() => handleMarkWord('correct')}
                    disabled={isCardExiting}
                  >
                    <span className="action-icon">👍</span>
                    <span className="action-text">Правильно</span>
                    <span className="keyboard-hint">SPACE</span>
                  </button>
                  <button
                    className="btn btn-action btn-skip"
                    onClick={() => handleMarkWord('skipped')}
                    disabled={isCardExiting}
                  >
                    <span className="action-icon">👎</span>
                    <span className="action-text">Пропустити</span>
                    <span className="keyboard-hint">S</span>
                  </button>
                </div>
              )}

              <div className="secondary-actions">
                <button className="btn btn-secondary btn-small" onClick={endRoundEarly}>
                  Завершити раунд <span className="keyboard-hint">ESC</span>
                </button>
              </div>
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
                {gameState.settings.gameMode === 'simple' && currentCard && (
                  <div className={`word-card ${cardClass} opponent-view`}>
                    <div className="word-display">
                      {currentCard.word}
                    </div>
                    <div className="word-counter">
                      Слово {currentRound.wordIndex + 1}/{currentRound.cards.length}
                    </div>
                  </div>
                )}
                {gameState.settings.gameMode === 'steal' && (
                  <div className="word-counter">
                    Слово {currentRound.wordIndex + 1}/{currentRound.cards.length}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="game-bottom-actions">
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
