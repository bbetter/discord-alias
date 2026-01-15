import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  type?: 'error' | 'info' | 'success' | 'warning';
  duration?: number;
}

const getToastEmoji = (type: string) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
    default:
      return 'ℹ️';
  }
};

export const Toast: React.FC<ToastProps> = React.memo(({ message, type = 'error', duration = 3000 }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (message) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [message, duration]);

  if (!message) return null;

  return (
    <div className={`toast ${show ? 'show' : ''} toast-${type}`}>
      <span className="toast-icon">{getToastEmoji(type)}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
});
