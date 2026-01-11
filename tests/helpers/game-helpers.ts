import { Page, expect } from '@playwright/test';

/**
 * Helper to generate a random player name
 */
export function generateRandomPlayerName(prefix: string = 'Player'): string {
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).substring(-4);
  return `${prefix}_${randomId}${timestamp}`;
}

/**
 * Helper to enter player name and submit the login form
 */
export async function enterPlayerName(page: Page, name: string): Promise<void> {
  // Wait for name input field and fill it
  const nameInput = page.locator('input[type="text"], input[placeholder*="ім"], input[placeholder*="name"]').first();
  await nameInput.waitFor({ timeout: 5000 });
  await nameInput.fill(name);
  await page.waitForTimeout(300);

  // Click the form submit button specifically (not the "Continue as {name}" button)
  await page.click('button[type="submit"]:has-text("Продовжити")');

  // Wait for MenuScreen to appear
  await page.waitForSelector('text=Створити кімнату', { timeout: 5000 });
  await page.waitForTimeout(500);
}

/**
 * Helper to create a room
 */
export async function createRoom(page: Page, playerName?: string): Promise<string> {
  // Enter player name if provided
  if (playerName) {
    await enterPlayerName(page, playerName);
  }

  await page.click('text=Створити кімнату');
  await page.waitForSelector('text=Код кімнати:');

  const roomCodeElement = await page.locator('.room-code-display strong').textContent();
  const roomCode = roomCodeElement?.trim() || '';

  expect(roomCode).toHaveLength(6);
  return roomCode;
}

/**
 * Helper to join a room by code
 */
export async function joinRoom(page: Page, roomCode: string, playerName?: string): Promise<void> {
  // Enter player name if provided
  if (playerName) {
    await enterPlayerName(page, playerName);
  }

  // Wait for "Join by code" button to be ready and click it
  const joinByCodeButton = page.locator('button:has-text("Приєднатися за кодом")');
  await joinByCodeButton.waitFor({ state: 'visible', timeout: 5000 });
  await joinByCodeButton.click();

  // Wait for the join form to appear
  const roomCodeInput = page.locator('input[placeholder="Введіть код кімнати"]');
  await roomCodeInput.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(300);

  // Fill room code
  await roomCodeInput.fill(roomCode);
  await page.waitForTimeout(200);

  // Click the join button (specifically the one in the form, not the toggle button)
  const joinButton = page.locator('.join-room-form button:has-text("Приєднатися")');
  await joinButton.click();

  // Wait for lobby screen to appear
  await page.waitForSelector('text=Код кімнати:', { timeout: 10000 });
  await page.waitForTimeout(500);
}

/**
 * Helper to join a team
 */
export async function joinTeam(page: Page, team: 'A' | 'B'): Promise<void> {
  const teamBox = team === 'A'
    ? page.locator('.team-box').first()
    : page.locator('.team-box').last();

  const joinButton = teamBox.locator('button:has-text("Приєднатися")');
  await joinButton.click();
  await page.waitForTimeout(500);
}

/**
 * Helper to start the game (host only)
 */
export async function startGame(page: Page): Promise<void> {
  const startButton = page.locator('button:has-text("Почати гру")');
  await expect(startButton).toBeEnabled({ timeout: 5000 });
  await startButton.click();
  await page.waitForSelector('.game-container, .countdown-container', { timeout: 10000 });
}

/**
 * Helper to wait for countdown to complete (takes ~4 seconds)
 */
export async function waitForCountdown(page: Page): Promise<void> {
  const hasCountdown = await page.locator('.countdown-container').isVisible().catch(() => false);
  if (hasCountdown) {
    // Wait for countdown to complete and game to start
    await page.waitForSelector('.game-container', { timeout: 8000 });
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to check if current player is the explainer
 */
export async function isExplainer(page: Page): Promise<boolean> {
  return await page.locator('text=Ви пояснюєте для:').isVisible().catch(() => false);
}

/**
 * Helper to play a single word
 */
export async function playWord(page: Page, action: 'correct' | 'skip'): Promise<string | null> {
  const wordVisible = await page.locator('.word-display').isVisible().catch(() => false);

  if (!wordVisible) {
    return null;
  }

  const currentWord = await page.locator('.word-display').textContent();

  if (currentWord?.includes('Раунд завершено')) {
    return null;
  }

  if (action === 'correct') {
    await page.click('button:has-text("Вірно")');
  } else {
    await page.click('button:has-text("Пропустити")');
  }

  await page.waitForTimeout(100);
  return currentWord;
}

/**
 * Helper to play words until round ends or all cards are exhausted
 */
export async function playRound(
  page: Page,
  maxWords: number = 50,
  correctProbability: number = 0.7
): Promise<number> {
  let wordsPlayed = 0;

  while (wordsPlayed < maxWords) {
    // Check if round has ended
    const roundEnded = await page.locator('text=Раунд завершено').isVisible().catch(() => false);
    if (roundEnded) {
      break;
    }

    const randomChoice = Math.random() < correctProbability;
    const word = await playWord(page, randomChoice ? 'correct' : 'skip');

    if (word === null) {
      break;
    }

    wordsPlayed++;

    // Small delay to let the UI update
    await page.waitForTimeout(50);
  }

  return wordsPlayed;
}

/**
 * Helper to initiate a dispute on a random word
 */
export async function initiateDispute(page: Page, reason?: string): Promise<boolean> {
  const disputeButtons = page.locator('.btn-dispute');
  const count = await disputeButtons.count();

  if (count === 0) {
    return false;
  }

  const randomWordIndex = Math.floor(Math.random() * count);
  await disputeButtons.nth(randomWordIndex).click();

  const disputeReason = reason || 'Помилково натиснуто / Використано заборонене слово';
  await page.fill('textarea', disputeReason);
  await page.click('button:has-text("Подати оскарження")');

  await page.waitForSelector('text=Оскарження слова', { timeout: 5000 });
  return true;
}

/**
 * Helper to vote on a dispute
 */
export async function voteOnDispute(page: Page, vote: 'agree' | 'disagree'): Promise<boolean> {
  const hasVoteButtons = await page
    .locator('button:has-text("Погодитись")')
    .isVisible()
    .catch(() => false);

  if (!hasVoteButtons) {
    return false;
  }

  if (vote === 'agree') {
    await page.click('button:has-text("Погодитись")');
  } else {
    await page.click('button:has-text("Не погодитись")');
  }

  await page.waitForTimeout(300);
  return true;
}

/**
 * Helper to wait for dispute to resolve and return to round end screen
 */
export async function waitForDisputeResolution(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for dispute screen to disappear (it should go back to round end screen)
  await page.waitForTimeout(1000);

  // Check if we're back on round end screen or if dispute screen is still there
  const disputeStillActive = await page.locator('text=Оскарження слова').isVisible().catch(() => false);

  if (disputeStillActive) {
    // Wait for dispute to resolve
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Оскарження слова'),
      { timeout }
    );
  }

  await page.waitForTimeout(500);
}

/**
 * Helper to continue to next round
 */
export async function continueToNextRound(page: Page): Promise<void> {
  await page.click('button:has-text("Продовжити")');
  await page.waitForTimeout(1000);
}

/**
 * Helper to check if game has ended
 */
export async function isGameEnded(page: Page): Promise<boolean> {
  return await page.locator('text=Гра завершена').isVisible().catch(() => false);
}

/**
 * Helper to wait for round end screen
 * Uses a shorter timeout since tests click through words quickly
 */
export async function waitForRoundEnd(page: Page, timeout: number = 15000): Promise<void> {
  await page.waitForSelector('text=Раунд завершено!', { timeout });
  await page.waitForTimeout(500);
}

/**
 * Helper to get current scores
 */
export async function getScores(page: Page): Promise<{ teamA: number; teamB: number }> {
  const teamAScore = await page.locator('.team-a-score strong').textContent();
  const teamBScore = await page.locator('.team-b-score strong').textContent();

  return {
    teamA: parseInt(teamAScore || '0'),
    teamB: parseInt(teamBScore || '0'),
  };
}
