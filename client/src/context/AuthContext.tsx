import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDiscord } from './DiscordContext';
import { getGuestId, saveGuestName, isInDiscordFrame } from '@/utils/guestAuth';
import type { AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  setGuestName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { auth: discordAuth, isReady: discordReady, error: discordError } = useDiscord();
  const [authState, setAuthState] = useState<AuthState>({
    mode: 'loading',
    player: null,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    // Check if we're in Discord frame
    const inDiscordFrame = isInDiscordFrame();

    if (inDiscordFrame) {
      // Wait for Discord authentication
      if (!discordReady) {
        setAuthState({
          mode: 'loading',
          player: null,
          isReady: false,
          error: null,
        });
      } else if (discordAuth) {
        // Successfully authenticated with Discord
        setAuthState({
          mode: 'discord',
          player: {
            id: discordAuth.user.id,
            username: discordAuth.user.username,
            avatar: discordAuth.user.avatar || undefined,
          },
          isReady: true,
          error: null,
        });
      } else if (discordError) {
        // Discord auth failed, fallback to guest mode
        setAuthState({
          mode: 'guest',
          player: null,
          isReady: false,
          error: null,
        });
      }
    } else {
      // Browser-only mode - use guest authentication

      // Don't auto-login even if a name is saved. Show the guest login screen
      // so the user can choose to continue as the saved identity or create a new one
      setAuthState({
        mode: 'guest',
        player: null,
        isReady: false,
        error: null,
      });
    }
  }, [discordAuth, discordReady, discordError]);

  const setGuestName = (name: string) => {
    // Persist the guest name to localStorage
    saveGuestName(name);

    setAuthState({
      mode: 'guest',
      player: {
        id: getGuestId(),
        username: name,
      },
      isReady: true,
      error: null,
    });
  };

  const value: AuthContextType = {
    ...authState,
    setGuestName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
