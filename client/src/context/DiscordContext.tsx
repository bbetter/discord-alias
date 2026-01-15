import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import type { DiscordAuth, DiscordContext as IDiscordContext } from '@/types/discord';

const DiscordContext = createContext<IDiscordContext | null>(null);

export const useDiscord = () => {
  const context = useContext(DiscordContext);
  if (!context) {
    throw new Error('useDiscord must be used within DiscordProvider');
  }
  return context;
};

interface DiscordProviderProps {
  children: ReactNode;
}

export const DiscordProvider: React.FC<DiscordProviderProps> = ({ children }) => {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [auth, setAuth] = useState<DiscordAuth | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDiscord = async () => {
      try {
        let sdk: DiscordSDK;

        if (!window.location.search.includes('frame_id')) {
          // No Discord frame - use mock mode
          console.log('[Discord] Using mock mode (no frame_id detected)');
          sdk = new DiscordSDKMock(
            import.meta.env.VITE_DISCORD_CLIENT_ID || 'mock-client-id',
            import.meta.env.VITE_DISCORD_GUILD_ID || 'mock-guild-id',
            import.meta.env.VITE_DISCORD_CHANNEL_ID || 'mock-channel-id',
            null
          ) as unknown as DiscordSDK;

          await sdk.ready();

          // Create mock auth data
          const mockUser = {
            id: `mock-${Date.now()}`,
            username: `Player${Math.floor(Math.random() * 1000)}`,
            discriminator: '0000',
            avatar: null,
            global_name: null,
          };

          setDiscordSdk(sdk);
          setAuth({
            access_token: 'mock-token',
            user: mockUser,
            scopes: ['identify', 'guilds', 'rpc.voice.read'],
            expires: new Date(Date.now() + 86400000).toISOString(),
            application: {
              id: 'mock-app',
              name: 'Alias',
              description: 'Word guessing game',
              icon: null,
            },
          });
          setIsMockMode(true);
          setIsReady(true);
          console.log('[Discord] Mock mode initialized:', mockUser.username);
          return;
        }

        // Discord frame detected - initialize real SDK with proper OAuth flow
        console.log('[Discord] Initializing Discord SDK...');
        sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

        // Wait for Discord to be ready
        await sdk.ready();
        console.log('[Discord] SDK ready');

        // Step 1: Authorize with Discord to get an authorization code
        console.log('[Discord] Requesting authorization...');
        const { code } = await sdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds', 'rpc.voice.read'],
        });

        console.log('[Discord] Authorization code received, exchanging for token...');

        // Step 2: Exchange the code for an access token via backend
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `Token exchange failed: ${response.statusText}`);
        }

        const tokenData = await response.json();
        console.log('[Discord] Token received from backend');

        // Step 3: Authenticate with Discord using the access token
        // This returns the complete auth data including user info
        const authData = await sdk.commands.authenticate({
          access_token: tokenData.access_token,
        });

        console.log('[Discord] Authenticated:', authData.user.username);

        setDiscordSdk(sdk);
        setAuth(authData as DiscordAuth);
        setIsReady(true);
      } catch (err) {
        console.error('[Discord] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Discord');
        setIsReady(false);
      }
    };

    initDiscord();
  }, []);

  const value: IDiscordContext = {
    discordSdk,
    auth,
    isReady,
    isMockMode,
    error,
  };

  return <DiscordContext.Provider value={value}>{children}</DiscordContext.Provider>;
};
