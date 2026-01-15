import { DiscordProvider } from '@/context/DiscordContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GameProvider, useGame } from '@/context/GameContext';

// Feature flag: set to false to disable voice activity feature
// To completely disable: comment out this import and the <VoiceActivityProvider> wrapper below
import { VoiceActivityProvider } from '@/context/VoiceActivityContext';

import { Toast } from '@/components/common/Toast';
import { LoadingScreen } from '@/components/screens/LoadingScreen';
import { GuestLoginScreen } from '@/components/screens/GuestLoginScreen';
import { MenuScreen } from '@/components/screens/MenuScreen';
import { LobbyScreen } from '@/components/screens/LobbyScreen';
import { CountdownScreen } from '@/components/screens/CountdownScreen';
import { GameScreen } from '@/components/screens/GameScreen';
import { RoundEndScreen } from '@/components/screens/RoundEndScreen';
import { PreStealCountdownScreen } from '@/components/screens/PreStealCountdownScreen';
import { LastWordStealScreen } from '@/components/screens/LastWordStealScreen';
import { DisputeScreen } from '@/components/screens/DisputeScreen';
import { GameEndScreen } from '@/components/screens/GameEndScreen';
import { VoiceActivityPanel } from '@/components/game/VoiceActivityPanel';
import { TestVoiceActivity } from '@/components/screens/TestVoiceActivity';
import { SCREENS } from '@/constants/screens';
import './styles/main.scss';

// Feature flag: set to false to disable voice activity feature
const ENABLE_VOICE_ACTIVITY = true;

const AppContent: React.FC = () => {
  const { isReady, mode, setGuestName, error: authError } = useAuth();
  const { gameState, error: gameError } = useGame();

  // Check for test mode
  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get('test');

  // Show test page if requested
  if (testMode === 'voice-activity') {
    return <TestVoiceActivity />;
  }

  // Derive currentScreen directly from state instead of storing it
  const currentScreen = (() => {
    if (!isReady) {
      if (mode === 'guest') {
        return SCREENS.GUEST_LOGIN;
      } else {
        return SCREENS.LOADING;
      }
    } else if (!gameState) {
      return SCREENS.MENU;
    } else if (gameState.status === 'lobby') {
      return SCREENS.LOBBY;
    } else if (gameState.status === 'countdown') {
      return SCREENS.COUNTDOWN;
    } else if (gameState.status === 'playing') {
      return SCREENS.GAME;
    } else if (gameState.status === 'round-end') {
      return SCREENS.ROUND_END;
    } else if (gameState.status === 'pre-steal-countdown') {
      return SCREENS.PRE_STEAL_COUNTDOWN;
    } else if (gameState.status === 'last-word-steal') {
      return SCREENS.LAST_WORD_STEAL;
    } else if (gameState.status === 'dispute') {
      return SCREENS.DISPUTE;
    } else if (gameState.status === 'finished') {
      return SCREENS.GAME_END;
    } else {
      console.warn("Unhandled status", gameState.status);
      return SCREENS.MENU;
    }
  })();

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
      {currentScreen === SCREENS.PRE_STEAL_COUNTDOWN && <PreStealCountdownScreen />}
      {currentScreen === SCREENS.LAST_WORD_STEAL && <LastWordStealScreen />}
      {currentScreen === SCREENS.DISPUTE && <DisputeScreen />}
      {currentScreen === SCREENS.GAME_END && <GameEndScreen />}

      {/* Voice Activity Panel - shows on all screens when players are connected */}
      {ENABLE_VOICE_ACTIVITY && gameState && <VoiceActivityPanel />}

      <Toast message={error} type="error" />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DiscordProvider>
      <AuthProvider>
        <GameProvider>
          {ENABLE_VOICE_ACTIVITY ? (
            <VoiceActivityProvider>
              <AppContent />
            </VoiceActivityProvider>
          ) : (
            <AppContent />
          )}
        </GameProvider>
      </AuthProvider>
    </DiscordProvider>
  );
};

export default App;
