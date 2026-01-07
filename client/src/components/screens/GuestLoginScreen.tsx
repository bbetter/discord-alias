import React, { useState } from 'react';
import { getGuestName, saveGuestName, createNewGuestId } from '@/utils/guestAuth';

interface GuestLoginScreenProps {
  onLogin: (name: string) => void;
}

export const GuestLoginScreen: React.FC<GuestLoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState(getGuestName() || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Будь ласка, введіть ваше ім\'я');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Ім\'я має містити хоча б 2 символи');
      return;
    }

    if (trimmedName.length > 20) {
      setError('Ім\'я не може бути довшим за 20 символів');
      return;
    }

    saveGuestName(trimmedName);
    onLogin(trimmedName);
  };

  return (
    <div className="screen active">
      <div className="menu-container">
        <h1>🎮 Alias</h1>
        <p className="subtitle">Гра в пояснення слів</p>

        <form className="guest-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="guest-name">Введіть ваше ім'я</label>
            <input
              id="guest-name"
              type="text"
              placeholder="Ваше ім'я"
              maxLength={20}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-large">
            Продовжити
          </button>
        </form>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {getGuestName() && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                // Continue as the saved identity (reuse existing session id if present)
                onLogin(getGuestName() || name.trim());
              }}
            >
              Продовжити як {getGuestName()}
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!name.trim()) {
                setError('Будь ласка, введіть ваше ім\'я перед створенням нової ідентичності');
                return;
              }

              // Create a new guest id and proceed to login with the provided name
              createNewGuestId();
              saveGuestName(name.trim());
              onLogin(name.trim());
            }}
          >
            Використати нову ідентичність
          </button>
        </div>

        <p className="info-text">
          Ви граєте як гість. Ваше ім'я буде збережено для наступних ігор.
        </p>
      </div>
    </div>
  );
};
