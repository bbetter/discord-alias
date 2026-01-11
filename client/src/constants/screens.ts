export const SCREENS = {
  LOADING: 'loading',
  GUEST_LOGIN: 'guest-login',
  MENU: 'menu',
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  GAME: 'game',
  ROUND_END: 'round-end',
  LAST_WORD_STEAL: 'last-word-steal',
  DISPUTE: 'dispute',
  GAME_END: 'game-end',
} as const;

export type Screen = typeof SCREENS[keyof typeof SCREENS];
