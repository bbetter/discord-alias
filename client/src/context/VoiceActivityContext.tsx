import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDiscord } from './DiscordContext';

interface VoiceActivityContextType {
  speakingPlayers: Set<string>;
  isPlayerSpeaking: (playerId: string) => boolean;
}

const VoiceActivityContext = createContext<VoiceActivityContextType | null>(null);

export const useVoiceActivity = () => {
  const context = useContext(VoiceActivityContext);
  if (!context) {
    throw new Error('useVoiceActivity must be used within VoiceActivityProvider');
  }
  return context;
};

interface VoiceActivityProviderProps {
  children: ReactNode;
}

export const VoiceActivityProvider: React.FC<VoiceActivityProviderProps> = ({ children }) => {
  const { discordSdk, isReady, isMockMode } = useDiscord();
  const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!discordSdk || !isReady) {
      return;
    }

    // Mock mode: simulate speaking for testing
    if (isMockMode) {
      console.log('[VoiceActivity] Mock mode enabled - will simulate speaking events');

      // Mock speaking: randomly toggle a player speaking every 5 seconds
      const mockInterval = setInterval(() => {
        // For mock mode, we don't have real player IDs yet, so we'll just log
        console.log('[VoiceActivity] Mock speaking event (no real players in mock mode)');
      }, 5000);

      return () => {
        clearInterval(mockInterval);
      };
    }

    // Real Discord mode: subscribe to voice events
    console.log('[VoiceActivity] Subscribing to Discord voice events...');

    const handleSpeakingStart = (data: { user_id: string }) => {
      console.log('[VoiceActivity] Speaking start:', data.user_id);
      setSpeakingPlayers((prev) => {
        const next = new Set(prev);
        next.add(data.user_id);
        return next;
      });
    };

    const handleSpeakingStop = (data: { user_id: string }) => {
      console.log('[VoiceActivity] Speaking stop:', data.user_id);
      setSpeakingPlayers((prev) => {
        const next = new Set(prev);
        next.delete(data.user_id);
        return next;
      });
    };

    // Subscribe to voice events
    const setupSubscriptions = async () => {
      try {
        // Get the channel ID from the Discord instance context
        const channelId = discordSdk.channelId;
        if (!channelId) {
          console.error('[VoiceActivity] No channel ID available');
          return;
        }

        console.log('[VoiceActivity] Channel ID:', channelId);

        // Subscribe with channel_id parameter
        await discordSdk.subscribe('SPEAKING_START', handleSpeakingStart, { channel_id: channelId });
        await discordSdk.subscribe('SPEAKING_STOP', handleSpeakingStop, { channel_id: channelId });
        console.log('[VoiceActivity] Successfully subscribed to voice events for channel:', channelId);
      } catch (error) {
        console.error('[VoiceActivity] Failed to subscribe to voice events:', error);
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      console.log('[VoiceActivity] Cleaning up voice event subscriptions');
      const channelId = discordSdk.channelId;
      if (channelId) {
        discordSdk.unsubscribe('SPEAKING_START', handleSpeakingStart, { channel_id: channelId }).catch((error) => {
          console.error('[VoiceActivity] Failed to unsubscribe from SPEAKING_START:', error);
        });
        discordSdk.unsubscribe('SPEAKING_STOP', handleSpeakingStop, { channel_id: channelId }).catch((error) => {
          console.error('[VoiceActivity] Failed to unsubscribe from SPEAKING_STOP:', error);
        });
      }
    };
  }, [discordSdk, isReady, isMockMode]);

  const isPlayerSpeaking = (playerId: string): boolean => {
    return speakingPlayers.has(playerId);
  };

  const value: VoiceActivityContextType = {
    speakingPlayers,
    isPlayerSpeaking,
  };

  return <VoiceActivityContext.Provider value={value}>{children}</VoiceActivityContext.Provider>;
};
