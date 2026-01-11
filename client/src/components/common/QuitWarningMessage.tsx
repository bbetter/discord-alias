import React from 'react';
import type { QuitWarnings } from '@/types/game';

interface QuitWarningMessageProps {
  warnings: QuitWarnings | null;
}

export const QuitWarningMessage: React.FC<QuitWarningMessageProps> = ({ warnings }) => {
  if (!warnings) return null;

  const messages: string[] = [];

  if (warnings.teamBelowMinimum) {
    messages.push(
      '⚠️ Після вашого виходу у вашій команді залишиться менше 2 гравців. Гра може не розпочатися або буде зупинена.'
    );
  }

  if (warnings.isCurrentExplainer) {
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
