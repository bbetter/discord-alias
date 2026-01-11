import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { generateRandomPlayerName, enterPlayerName } from './helpers/game-helpers';

interface GameContext {
  context: BrowserContext;
  page: Page;
  playerName: string;
}

test.describe('Orchestrated Alias Game Test', () => {
  let browser: Browser;
  let gameContexts: GameContext[] = [];
  let roomCode: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.afterAll(async () => {
    // Close all contexts
    for (const gc of gameContexts) {
      await gc.context.close();
    }
  });

  test('should complete full game flow with 4 players', async () => {
    // Step 1: Create 4 browser contexts (private mode)
    console.log('Creating 4 browser contexts...');
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext({
        // Private/incognito mode
        // Note: Each context is isolated by default in Playwright
      });
      const page = await context.newPage();
      await page.goto('/');

      gameContexts.push({
        context,
        page,
        playerName: generateRandomPlayerName(`P${i + 1}`)
      });
    }

    // Step 2: Host creates room (first player)
    console.log('Host creating room...');
    const hostPage = gameContexts[0].page;

    // Enter host name
    await enterPlayerName(hostPage, gameContexts[0].playerName);

    // Click "Створити кімнату" button
    await hostPage.click('text=Створити кімнату');

    // Wait for lobby screen and get room code
    await hostPage.waitForSelector('text=Код кімнати:');
    const roomCodeElement = await hostPage.locator('.room-code-display strong').textContent();
    roomCode = roomCodeElement?.trim() || '';
    console.log(`Room created with code: ${roomCode}`);

    expect(roomCode).toHaveLength(6);

    // Step 3: Other players join the room
    console.log('Other players joining room...');
    for (let i = 1; i < 4; i++) {
      const playerPage = gameContexts[i].page;

      // Enter player name
      await enterPlayerName(playerPage, gameContexts[i].playerName);

      // Click "Приєднатися за кодом"
      await playerPage.click('text=Приєднатися за кодом');

      // Enter room code
      await playerPage.fill('input[placeholder="Введіть код кімнати"]', roomCode);

      // Click join button
      await playerPage.click('button:has-text("Приєднатися")');

      // Wait for lobby
      await playerPage.waitForSelector('text=Код кімнати:');
      console.log(`Player ${i + 1} joined`);
    }

    // Step 4: Players join teams (2 per team)
    console.log('Players joining teams...');

    // Players 1 and 2 join Team A
    for (let i = 0; i < 2; i++) {
      const playerPage = gameContexts[i].page;
      const teamButtons = await playerPage.locator('.team-box').first().locator('button:has-text("Приєднатися")');
      await teamButtons.click();
      await playerPage.waitForTimeout(500); // Wait for server to process
    }

    // Players 3 and 4 join Team B
    for (let i = 2; i < 4; i++) {
      const playerPage = gameContexts[i].page;
      const teamButtons = await playerPage.locator('.team-box').last().locator('button:has-text("Приєднатися")');
      await teamButtons.click();
      await playerPage.waitForTimeout(500);
    }

    console.log('All players joined teams');
    await hostPage.waitForTimeout(1000);

    // Step 5: Host starts game
    console.log('Starting game...');
    const startButton = hostPage.locator('button:has-text("Почати гру")');
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Wait for countdown or game screen
    await hostPage.waitForSelector('.game-container, .countdown-container', { timeout: 10000 });
    console.log('Game started!');

    // Step 6: Play through multiple rounds
    const roundsToPlay = 3;
    for (let round = 0; round < roundsToPlay; round++) {
      console.log(`\n=== Round ${round + 1} ===`);

      // Wait for game screen to appear
      await hostPage.waitForSelector('.game-container', { timeout: 15000 });

      // Find who is the explainer
      let explainerIndex = -1;
      for (let i = 0; i < gameContexts.length; i++) {
        const isExplainer = await gameContexts[i].page.locator('text=Ви пояснюєте для:').isVisible().catch(() => false);
        if (isExplainer) {
          explainerIndex = i;
          break;
        }
      }

      if (explainerIndex === -1) {
        console.log('No explainer found, waiting...');
        await hostPage.waitForTimeout(2000);
        continue;
      }

      console.log(`Player ${explainerIndex + 1} is explaining`);
      const explainerPage = gameContexts[explainerIndex].page;

      // Play through words randomly
      let wordsPlayed = 0;
      const maxWords = 15; // Play up to 15 words

      while (wordsPlayed < maxWords) {
        // Check if word card is visible
        const wordVisible = await explainerPage.locator('.word-display').isVisible().catch(() => false);
        if (!wordVisible) {
          console.log('No more words or round ended');
          break;
        }

        // Get current word
        const currentWord = await explainerPage.locator('.word-display').textContent();

        if (currentWord?.includes('Раунд завершено')) {
          console.log('Round completed');
          break;
        }

        // Randomly click "Вірно" or "Пропустити"
        const randomChoice = Math.random() > 0.3; // 70% correct, 30% skip

        if (randomChoice) {
          await explainerPage.click('button:has-text("Вірно")');
          console.log(`✓ Correct: ${currentWord}`);
        } else {
          await explainerPage.click('button:has-text("Пропустити")');
          console.log(`→ Skipped: ${currentWord}`);
        }

        wordsPlayed++;
        await explainerPage.waitForTimeout(200); // Small delay between words
      }

      console.log(`Played ${wordsPlayed} words`);

      // Wait for round end screen
      await hostPage.waitForSelector('text=Раунд завершено!', { timeout: 65000 });
      console.log('Round ended, showing results');

      // Step 7: Dispute some words
      console.log('Disputing words...');
      const wordsToDispute = Math.floor(Math.random() * 2) + 1; // Dispute 1-2 words randomly

      for (let d = 0; d < wordsToDispute; d++) {
        // Random player initiates dispute
        const disputeInitiator = Math.floor(Math.random() * 4);
        const disputePage = gameContexts[disputeInitiator].page;

        // Find dispute buttons
        const disputeButtons = disputePage.locator('.btn-dispute');
        const count = await disputeButtons.count();

        if (count > 0) {
          const randomWordIndex = Math.floor(Math.random() * count);
          await disputeButtons.nth(randomWordIndex).click();

          // Fill dispute reason
          await disputePage.fill('textarea', 'Помилково натиснуто / Використано заборонене слово');

          // Submit dispute
          await disputePage.click('button:has-text("Подати оскарження")');
          console.log(`Player ${disputeInitiator + 1} initiated dispute`);

          // Wait for dispute screen
          await disputePage.waitForSelector('text=Оскарження слова', { timeout: 5000 });

          // All players vote
          for (let i = 0; i < gameContexts.length; i++) {
            const voterPage = gameContexts[i].page;
            const hasVoteButtons = await voterPage.locator('button:has-text("Погодитись")').isVisible().catch(() => false);

            if (hasVoteButtons) {
              // Randomly vote
              const agreeVote = Math.random() > 0.5;
              if (agreeVote) {
                await voterPage.click('button:has-text("Погодитись")');
                console.log(`Player ${i + 1} voted: Agree`);
              } else {
                await voterPage.click('button:has-text("Не погодитись")');
                console.log(`Player ${i + 1} voted: Disagree`);
              }
              await voterPage.waitForTimeout(300);
            }
          }

          // Wait for dispute to resolve and return to round end screen
          await hostPage.waitForSelector('text=Раунд завершено!', { timeout: 5000 });
          console.log('Dispute resolved');
        }
      }

      // Step 8: Continue to next round or check if game ended
      const gameEnded = await hostPage.locator('text=Гра завершена').isVisible().catch(() => false);

      if (gameEnded) {
        console.log('\n=== Game Ended! ===');
        break;
      }

      // Click continue button
      const continueButton = hostPage.locator('button:has-text("Продовжити")');
      await continueButton.click();
      console.log('Continuing to next round...');

      await hostPage.waitForTimeout(1000);
    }

    console.log('\n=== Test Completed Successfully ===');
  });
});
