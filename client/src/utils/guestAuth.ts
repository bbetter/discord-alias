/**
 * Guest authentication utilities for browser-based users
 */

const GUEST_ID_KEY = 'alias_guest_id';
const GUEST_NAME_KEY = 'alias_guest_name';

/**
 * Generate a unique guest ID
 */
function generateGuestId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create a guest ID (unique per browser tab/window)
 */
export function getGuestId(): string {
  let guestId = sessionStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = generateGuestId();
    sessionStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

/**
 * Get stored guest name
 */
export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_NAME_KEY);
}

/**
 * Save guest name
 */
export function saveGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
}

/**
 * Clear guest data (for logout)
 */
export function clearGuestData(): void {
  localStorage.removeItem(GUEST_NAME_KEY);
  // Keep the ID for consistency, but clear the name
}

/**
 * Force creation of a new guest ID (useful for testing / opening multiple identities in same browser)
 */
export function createNewGuestId(): string {
  const newId = generateGuestId();
  sessionStorage.setItem(GUEST_ID_KEY, newId);
  return newId;
}

/**
 * Check if we're in a Discord frame
 */
export function isInDiscordFrame(): boolean {
  // Check if we have Discord frame parameters
  return window.location.search.includes('frame_id') ||
         window.location.search.includes('instance_id');
}
