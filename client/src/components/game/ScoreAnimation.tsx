import React, { useEffect, useState } from 'react';

interface ScoreAnimationProps {
  change: number;
  onComplete?: () => void;
}

export const ScoreAnimation: React.FC<ScoreAnimationProps> = ({ change, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible || change === 0) return null;

  const isPositive = change > 0;

  return (
    <div
      className={`score-animation ${isPositive ? 'positive' : 'negative'}`}
      style={{
        animation: 'scoreFloat 1.5s ease-out forwards',
      }}
    >
      {isPositive ? '+' : ''}
      {change}
    </div>
  );
};
