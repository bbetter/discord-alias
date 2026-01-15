import React from 'react';

interface RoundProgressProps {
  currentRound: number;
  totalRounds: number;
}

export const RoundProgress: React.FC<RoundProgressProps> = ({ currentRound, totalRounds }) => {
  return (
    <div className="round-progress">
      <div className="round-progress-label">
        Раунд {currentRound} з {totalRounds}
      </div>
      <div className="round-progress-dots">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={`progress-dot ${i < currentRound ? 'completed' : i === currentRound - 1 ? 'active' : ''}`}
            title={`Раунд ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
