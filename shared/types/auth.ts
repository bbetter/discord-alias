import type { Player } from './game.js';

export type AuthMode = 'discord' | 'guest' | 'loading';

export interface AuthState {
  mode: AuthMode;
  player: Player | null;
  isReady: boolean;
  error: string | null;
}
