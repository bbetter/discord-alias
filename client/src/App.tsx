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
import { LastWordStealScreen } from '@/components/screens/LastWordStealScreen';
import { DisputeScreen } from '@/components/screens/DisputeScreen';
import { GameEndScreen } from '@/components/screens/GameEndScreen';
import { SCREENS, type Screen } from '@/constants/screens';
import './styles/main.scss';

const AppContent: React.FC = () => {
  const { isReady, mode, setGuestName, error: authError } = useAuth();
  const { gameState, error: gameError } = useGame();
  const [currentScreen, setCurrentScreen] = useState<Screen>(SCREENS.LOADING);

  useEffect(() => {
    if (!isReady) {
      if (mode === 'guest') {
        // Guest mode but name not set yet
        setCurrentScreen(SCREENS.GUEST_LOGIN);
      } else {
        // Loading Discord auth
        setCurrentScreen(SCREENS.LOADING);
      }
    } else if (!gameState) {
      setCurrentScreen(SCREENS.MENU);
    } else if (gameState.status === 'lobby') {
      setCurrentScreen(SCREENS.LOBBY);
    } else if (gameState.status === 'countdown') {
      setCurrentScreen(SCREENS.COUNTDOWN);
    } else if (gameState.status === 'playing') {
      setCurrentScreen(SCREENS.GAME);
    } else if (gameState.status === 'round-end') {
      setCurrentScreen(SCREENS.ROUND_END);
    } else if (gameState.status === 'last-word-steal') {
      setCurrentScreen(SCREENS.LAST_WORD_STEAL);
    } else if (gameState.status === 'dispute') {
      setCurrentScreen(SCREENS.DISPUTE);
    } else if (gameState.status === 'finished') {
      setCurrentScreen(SCREENS.GAME_END);
    }
  }, [isReady, mode, gameState]);

  const handleGuestLogin = (name: string) => {
    setGuestName(name);
  };

  const error = authError || gameError;

  return (
    <div id="app">
      {currentScreen === SCREENS.LOADING && <LoadingScreen />}
      {currentScreen === SCREENS.GUEST_LOGIN && <GuestLoginScreen onLogin={handleGuestLogin} />}
      {currentScreen === SCREENS.MENU && <MenuScreen />}
      {currentScreen === SCREENS.LOBBY && <LobbyScreen />}
      {currentScreen === SCREENS.COUNTDOWN && <CountdownScreen />}
      {currentScreen === SCREENS.GAME && <GameScreen />}
      {currentScreen === SCREENS.ROUND_END && <RoundEndScreen />}
      {currentScreen === SCREENS.LAST_WORD_STEAL && <LastWordStealScreen />}
      {currentScreen === SCREENS.DISPUTE && <DisputeScreen />}
      {currentScreen === SCREENS.GAME_END && <GameEndScreen />}
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
