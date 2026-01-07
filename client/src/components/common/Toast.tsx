import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  type?: 'error' | 'info';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'error', duration = 3000 }) => {
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
      {message}
    </div>
  );
};
