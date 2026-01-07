import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="screen active">
      <div className="loader"></div>
      <p>Завантаження гри...</p>
    </div>
  );
};
