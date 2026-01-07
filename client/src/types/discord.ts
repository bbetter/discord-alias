import type { DiscordSDK } from '@discord/embedded-app-sdk';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string | null;
  global_name?: string | null;
}

export interface DiscordAuth {
  access_token: string;
  user: DiscordUser;
  scopes: string[];
  expires: string;
  application: {
    id: string;
    description: string;
    name: string;
    icon: string | null;
    rpc_origins?: string[];
  };
}

export interface DiscordContext {
  discordSdk: DiscordSDK | null;
  auth: DiscordAuth | null;
  isReady: boolean;
  isMockMode: boolean;
  error: string | null;
}
