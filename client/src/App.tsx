import React, { useState, useEffect } from 'react';
import { DiscordProvider } from '@/context/DiscordContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GameProvider, useGame } from '@/context/GameContext';
import { Toast } from '@/components/common/Toast';
import { LoadingScreen } from '@/components/screens/LoadingScreen';
import { GuestLoginScreen } from '@/components/screens/GuestLoginScreen';
import { MenuScreen } from '@/components/screens/MenuScreen';
import { LobbyScreen } from '@/components/screens/LobbyScreen';
import { CountdownScreen } from '@/components/screens/CountdownScreen';
import { GameScreen } from '@/components/screens/GameScreen';
import { RoundEndScreen } from '@/components/screens/RoundEndScreen';
import { GameEndScreen } from '@/components/screens/GameEndScreen';
import './styles/main.scss';

type Screen = 'loading' | 'guest-login' | 'menu' | 'lobby' | 'countdown' | 'game' | 'round-end' | 'game-end';

const AppContent: React.FC = () => {
  const { isReady, mode, setGuestName, error: authError } = useAuth();
  const { gameState, error: gameError } = useGame();
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');

  useEffect(() => {
    if (!isReady) {
      if (mode === 'guest') {
        // Guest mode but name not set yet
        setCurrentScreen('guest-login');
      } else {
        // Loading Discord auth
        setCurrentScreen('loading');
      }
    } else if (!gameState) {
      setCurrentScreen('menu');
    } else if (gameState.status === 'lobby') {
      setCurrentScreen('lobby');
    } else if (gameState.status === 'countdown') {
      setCurrentScreen('countdown');
    } else if (gameState.status === 'playing') {
      setCurrentScreen('game');
    } else if (gameState.status === 'round-end') {
      setCurrentScreen('round-end');
    } else if (gameState.status === 'finished') {
      setCurrentScreen('game-end');
    }
  }, [isReady, mode, gameState]);

  const handleGuestLogin = (name: string) => {
    setGuestName(name);
  };

  const error = authError || gameError;

  return (
    <div id="app">
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'guest-login' && <GuestLoginScreen onLogin={handleGuestLogin} />}
      {currentScreen === 'menu' && <MenuScreen />}
      {currentScreen === 'lobby' && <LobbyScreen />}
      {currentScreen === 'countdown' && <CountdownScreen />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'round-end' && <RoundEndScreen />}
      {currentScreen === 'game-end' && <GameEndScreen />}
      <Toast message={error} type="error" />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DiscordProvider>
      <AuthProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </AuthProvider>
    </DiscordProvider>
  );
};

export default App;
