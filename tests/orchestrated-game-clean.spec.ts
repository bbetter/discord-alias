import { test, Browser, BrowserContext, Page } from '@playwright/test';
import {
  createRoom,
  joinRoom,
  joinTeam,
  configureGameSettings,
  startGame,
  waitForCountdown,
  isExplainer,
  playRound,
  waitForRoundEnd,
  initiateDispute,
  voteOnDispute,
  waitForDisputeResolution,
  continueToNextRound,
  isGameEnded,
  getScores,
  generateRandomPlayerName,
  enterPlayerName,
} from './helpers/game-helpers';

interface GameContext {
  context: BrowserContext;
  page: Page;
  playerName: string;
}

test.describe('Orchestrated Alias Game Test (Clean)', () => {
  let browser: Browser;
  let gameContexts: GameContext[] = [];
  let roomCode: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.afterAll(async () => {
    // Close all remaining contexts
    console.log('\n🧹 Cleaning up remaining browser contexts...');
    for (const gc of gameContexts) {
      try {
        await gc.context.close();
      } catch (e) {
        // Context may already be closed
      }
    }
    console.log('  ✓ Cleanup complete');
  });

  test('should complete full game with 4 players, disputes, and random actions', async () => {
    // ======================
    // SETUP: Create 4 private browser tabs
    // ======================
    console.log('🚀 Creating 4 browser contexts (private mode)...');
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Listen to browser console
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[ROUND_ENDED]') || text.includes('[QUIT_CONFIRMED]') || text.includes('GameEndScreen')) {
          console.log(`[Player ${i+1}]`, text);
        }
      });

      await page.goto('/');

      gameContexts.push({
        context,
        page,
        playerName: generateRandomPlayerName(`P${i + 1}`),
      });
      console.log(`  ✓ Player ${i + 1} ready`);
    }

    // ======================
    // STEP 1: Host creates room
    // ======================
    console.log('\n📋 Host creating room...');
    const hostPage = gameContexts[0].page;
    roomCode = await createRoom(hostPage, gameContexts[0].playerName);
    console.log(`  ✓ Room created: ${roomCode}`);

    // ======================
    // STEP 2: Players 2-4 join room
    // ======================
    console.log('\n👥 Other players joining room...');
    for (let i = 1; i < 4; i++) {
      await joinRoom(gameContexts[i].page, roomCode, gameContexts[i].playerName);
      console.log(`  ✓ Player ${i + 1} joined`);
    }

    // ======================
    // STEP 3: Players join teams (2 per team)
    // ======================
    console.log('\n🎯 Players joining teams...');

    // Players 1 and 2 → Team A
    for (let i = 0; i < 2; i++) {
      await joinTeam(gameContexts[i].page, 'A');
      console.log(`  ✓ Player ${i + 1} joined Team A`);
    }

    // Players 3 and 4 → Team B
    for (let i = 2; i < 4; i++) {
      await joinTeam(gameContexts[i].page, 'B');
      console.log(`  ✓ Player ${i + 1} joined Team B`);
    }

    await hostPage.waitForTimeout(1000);

    // ======================
    // STEP 4: Configure game settings for quick game
    // ======================
    console.log('\n⚙️  Configuring game settings...');
    await configureGameSettings(hostPage, {
      pointsToWin: 15, // Low points to reach game end quickly
    });
    console.log('  ✓ Set pointsToWin to 15 for quick game end');

    // ======================
    // STEP 5: Host starts game
    // ======================
    console.log('\n🎮 Starting game...');
    await startGame(hostPage);
    console.log('  ✓ Game started!');

    // Wait for countdown to complete
    console.log('\n⏱️  Waiting for countdown...');
    await waitForCountdown(hostPage);
    console.log('  ✓ Countdown complete!');

    // ======================
    // STEP 6: Play through rounds until game ends
    // ======================
    const maxRounds = 10; // Safety limit

    for (let round = 0; round < maxRounds; round++) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔄 ROUND ${round + 1}`);
      console.log('='.repeat(50));

      // Find the explainer
      let explainerIndex = -1;
      for (let i = 0; i < gameContexts.length; i++) {
        if (await isExplainer(gameContexts[i].page)) {
          explainerIndex = i;
          break;
        }
      }

      if (explainerIndex === -1) {
        console.log('⚠️ No explainer found, waiting...');
        await hostPage.waitForTimeout(2000);
        continue;
      }

      console.log(`\n🎤 Player ${explainerIndex + 1} is explaining`);
      const explainerPage = gameContexts[explainerIndex].page;

      // Play through words rapidly (70% correct, 30% skip)
      console.log('  ⚡ Playing words rapidly...');
      const wordsPlayed = await playRound(explainerPage, 50, 0.7);
      console.log(`  ✓ Played ${wordsPlayed} words`);

      // Wait for either round end or game end (if team reached pointsToWin)
      const result = await waitForRoundEnd(explainerPage);

      if (result === 'game-end') {
        console.log('\n🏆 Game Ended!');
      } else {
        console.log('\n📊 Round ended, showing results');
      }

      // Display scores (can check from any page, using host page for consistency)
      const scores = await getScores(hostPage);
      console.log(`  Team A: ${scores.teamA} | Team B: ${scores.teamB}`);

      // ======================
      // STEP 7: Check if game ended
      // ======================
      if (result === 'game-end') {
        console.log('\n🏆 Game Ended!');
        const finalScores = await getScores(hostPage);
        console.log(`Final Score - Team A: ${finalScores.teamA} | Team B: ${finalScores.teamB}`);

        // Close all windows except host (player 1)
        console.log('\n🪟 Closing all windows except host...');
        for (let i = 1; i < gameContexts.length; i++) {
          await gameContexts[i].context.close();
          console.log(`  ✓ Closed Player ${i + 1} window`);
        }
        console.log('  ✓ Host window remains open for verification');

        // Wait a moment for the screen to fully render
        await hostPage.waitForTimeout(1000);

        // Take a screenshot of the GameEndScreen
        await hostPage.screenshot({ path: 'test-results/game-end-screen.png', fullPage: true });
        console.log('  📸 Screenshot saved to test-results/game-end-screen.png');

        console.log('\n' + '='.repeat(50));
        console.log('👁️  VERIFY GAMEENDSCREEN IS SHOWING CORRECTLY');
        console.log('   Check the browser window for:');
        console.log('   - Winner announcement');
        console.log('   - Final scores');
        console.log('   - Game statistics');
        console.log('   - Host action buttons');
        console.log('   OR check the screenshot at:');
        console.log('   test-results/game-end-screen.png');
        console.log('='.repeat(50));

        // Wait for 30 seconds to allow manual verification
        console.log('\n⏳ Waiting 30 seconds for verification...');
        await hostPage.waitForTimeout(30000);

        break;
      }

      // Continue to next round
      console.log('\n➡️ Continuing to next round...');
      await continueToNextRound(hostPage);

      // Wait for countdown if there is one
      await waitForCountdown(hostPage);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
  });
});
