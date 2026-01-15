import { test, Browser, BrowserContext, Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
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

const execAsync = promisify(exec);

// Team workspaces - each team gets their own workspace
const TEAM_A_WORKSPACE = 9;
const TEAM_B_WORKSPACE = 10;

// Move the currently focused window to a specific workspace using hyprctl
async function moveWindowToWorkspace(workspace: number): Promise<void> {
  try {
    // Move the active window to the specified workspace silently (without following)
    await execAsync(`hyprctl dispatch movetoworkspacesilent ${workspace}`);
    console.log(`    → Moved to workspace ${workspace}`);
  } catch (error) {
    // Silently fail if hyprctl is not available (not running Hyprland)
    console.log('    (hyprctl not available, skipping window move)');
  }
}

interface GameContext {
  context: BrowserContext;
  page: Page;
  playerName: string;
  isBot: boolean;
  team?: 'A' | 'B';
}

test.describe('Bot Testing Mode', () => {
  let browser: Browser;
  let gameContexts: GameContext[] = [];
  let roomCode: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.afterAll(async () => {
    console.log('\n🧹 Cleaning up bot contexts...');
    for (const gc of gameContexts) {
      if (gc.isBot) {
        try {
          await gc.context.close();
        } catch (e) {
          // Context may already be closed
        }
      }
    }
    console.log('  ✓ Cleanup complete');
  });

  test('Launch game with 3 bots for manual testing', async () => {
    test.setTimeout(600000); // 10 minutes for manual testing

    // ======================
    // CONFIGURATION
    // ======================
    const NUM_BOTS = 3; // Change this: 3-10 bots allowed

    // Validate bot count
    if (NUM_BOTS < 3 || NUM_BOTS > 10) {
      throw new Error('NUM_BOTS must be between 3 and 10');
    }

    // ======================
    // SETUP: Create browser contexts - 1 manual + N bots
    // ======================
    console.log('\n🚀 Launching bot testing mode...');
    console.log('  - 1 manual window (you control this)');
    console.log(`  - ${NUM_BOTS} bot windows (automated)`);
    console.log(`  - Team A windows → workspace ${TEAM_A_WORKSPACE}`);
    console.log(`  - Team B windows → workspace ${TEAM_B_WORKSPACE}\n`);

    // Create manual player window (host)
    console.log('🎮 Creating YOUR window (Host - Player 1)...');
    const manualContext = await browser.newContext();
    const manualPage = await manualContext.newPage();

    manualPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[ROUND_ENDED]') || text.includes('[QUIT_CONFIRMED]')) {
        console.log(`[YOU]`, text);
      }
    });

    await manualPage.goto('/');

    gameContexts.push({
      context: manualContext,
      page: manualPage,
      playerName: 'You (Host)',
      isBot: false,
    });
    console.log('  ✓ Your window ready - YOU ARE THE HOST');

    // Create N bot windows
    for (let i = 0; i < NUM_BOTS; i++) {
      console.log(`\n🤖 Creating Bot ${i + 1} window...`);
      const context = await browser.newContext();
      const page = await context.newPage();

      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[ROUND_ENDED]') || text.includes('[QUIT_CONFIRMED]')) {
          console.log(`[Bot ${i+1}]`, text);
        }
      });

      await page.goto('/');

      // Windows will be moved to team workspaces after joining teams

      gameContexts.push({
        context,
        page,
        playerName: generateRandomPlayerName(`Bot${i + 1}`),
        isBot: true,
      });
      console.log(`  ✓ Bot ${i + 1} ready`);
    }

    // ======================
    // Wait for manual player to create room
    // ======================
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 ACTION REQUIRED: Create a room in YOUR window');
    console.log('='.repeat(60));
    console.log('1. Enter your name in the guest login');
    console.log('2. Click "Створити кімнату" (Create Room)');
    console.log('3. Wait for the lobby to load...\n');

    // Poll until room code appears
    let detectedRoomCode: string | null = null;
    while (!detectedRoomCode) {
      await manualPage.waitForTimeout(1000);

      // Check if lobby screen is visible
      const roomCodeElement = await manualPage.$('.room-code-display strong');
      if (roomCodeElement) {
        const code = await roomCodeElement.textContent();
        if (code && code.length === 6) {
          detectedRoomCode = code;
          roomCode = code;
        }
      }
    }

    console.log(`\n✅ Room detected: ${roomCode}`);
    console.log('  Bots will now join automatically...\n');

    // ======================
    // Bots join the room
    // ======================
    console.log('👥 Bots joining room...');
    for (let i = 1; i <= NUM_BOTS; i++) {
      await joinRoom(gameContexts[i].page, roomCode, gameContexts[i].playerName);
      console.log(`  ✓ ${gameContexts[i].playerName} joined`);
      await gameContexts[i].page.waitForTimeout(500);
    }

    // ======================
    // Bots join teams automatically
    // ======================
    console.log('\n🎯 Bots joining teams...');
    console.log('  Distributing bots evenly between Team A and Team B...\n');

    // Distribute bots alternating between teams for even distribution
    // This ensures at least one bot on each team
    for (let i = 1; i <= NUM_BOTS; i++) {
      const team: 'A' | 'B' = i % 2 === 1 ? 'A' : 'B';
      const teamName = team === 'A' ? 'Team A' : 'Team B';
      const workspace = team === 'A' ? TEAM_A_WORKSPACE : TEAM_B_WORKSPACE;

      await joinTeam(gameContexts[i].page, team);
      gameContexts[i].team = team;
      console.log(`  ✓ ${gameContexts[i].playerName} → ${teamName}`);

      // Focus the bot window and move it to the team workspace
      await gameContexts[i].page.bringToFront();
      await moveWindowToWorkspace(workspace);

      await gameContexts[i].page.waitForTimeout(500);
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('👤 ACTION REQUIRED: Join a team in YOUR window');
    console.log('='.repeat(60));
    console.log('Choose Team A or Team B by clicking "Приєднатися"');
    console.log('Then configure game settings if you want');
    console.log('Finally click "Почати гру" (Start Game)\n');

    // Wait for host to join a team (but don't move their window - only bots get moved)
    let hostTeamDetected = false;
    while (!hostTeamDetected) {
      await manualPage.waitForTimeout(500);

      // Check which team the host joined by looking for the player in team containers
      const teamAPlayers = await manualPage.$$('.team-box:first-child .player-card');
      const teamBPlayers = await manualPage.$$('.team-box:last-child .player-card');

      // The host is detected if they're in one of the teams (more than just bots)
      // We check by seeing if we can find a "Ви" (You) indicator or by counting players
      const teamAJoinBtn = await manualPage.$('.team-box:first-child .btn:has-text("Приєднатися")');
      const teamBJoinBtn = await manualPage.$('.team-box:last-child .btn:has-text("Приєднатися")');

      // If join button is not visible for a team, host is on that team
      if (!teamAJoinBtn && teamAPlayers.length > 0) {
        gameContexts[0].team = 'A';
        hostTeamDetected = true;
        console.log('✅ You joined Team A');
        // Host window stays on current workspace - only bots are moved
      } else if (!teamBJoinBtn && teamBPlayers.length > 0) {
        gameContexts[0].team = 'B';
        hostTeamDetected = true;
        console.log('✅ You joined Team B');
        // Host window stays on current workspace - only bots are moved
      }
    }

    console.log('\n💡 Configure settings and click "Почати гру" to start...\n');

    // Wait for game to start (detect countdown or playing status)
    let gameStarted = false;
    while (!gameStarted) {
      await manualPage.waitForTimeout(1000);

      // Check if countdown or game screen appeared
      const countdownVisible = await manualPage.$('.countdown-container');
      const gameVisible = await manualPage.$('.game-container');

      if (countdownVisible || gameVisible) {
        gameStarted = true;
      }
    }

    console.log('\n✅ Game started! Bots will now play automatically...\n');

    // ======================
    // GAME LOOP: Bots play automatically
    // ======================
    let roundNumber = 1;
    const maxRounds = 20; // Safety limit

    while (roundNumber <= maxRounds) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎮 ROUND ${roundNumber}`);
      console.log('='.repeat(60));

      // Wait for countdown to finish
      console.log('⏳ Waiting for countdown...');
      for (let i = 1; i <= NUM_BOTS; i++) {
        if (gameContexts[i].isBot) {
          await waitForCountdown(gameContexts[i].page);
        }
      }

      // Check who is the explainer
      let explainerIndex = -1;
      for (let i = 1; i <= NUM_BOTS; i++) {
        if (gameContexts[i].isBot && await isExplainer(gameContexts[i].page)) {
          explainerIndex = i;
          break;
        }
      }

      if (explainerIndex !== -1) {
        console.log(`\n🤖 ${gameContexts[explainerIndex].playerName} is explaining`);
        console.log('  (Bot will play automatically)');

        // Bot plays the round
        await playRound(gameContexts[explainerIndex].page, {
          maxWords: 20,
          correctProbability: 0.7,
          skipProbability: 0.2,
        });
      } else {
        console.log(`\n👤 YOU are explaining this round!`);
        console.log('  Play in your window...');
      }

      // Wait for round to end
      console.log('\n⏸️  Waiting for round to end...');
      for (let i = 1; i <= NUM_BOTS; i++) {
        if (gameContexts[i].isBot) {
          try {
            await waitForRoundEnd(gameContexts[i].page, 30000);
          } catch (e) {
            // May timeout if still waiting
          }
        }
      }

      // Check if game ended
      let gameEnded = false;
      for (let i = 1; i <= NUM_BOTS; i++) {
        if (gameContexts[i].isBot && await isGameEnded(gameContexts[i].page)) {
          gameEnded = true;
          break;
        }
      }

      if (gameEnded) {
        console.log('\n🏆 GAME ENDED!');
        const scores = await getScores(gameContexts[1].page);
        console.log(`  Team A: ${scores.teamA}`);
        console.log(`  Team B: ${scores.teamB}`);
        break;
      }

      // Maybe have a random dispute
      if (Math.random() < 0.15 && roundNumber > 1) {
        console.log('\n⚠️  Bot initiating a random dispute...');
        try {
          // Find a bot that's not explainer
          for (let i = 1; i <= NUM_BOTS; i++) {
            if (gameContexts[i].isBot && i !== explainerIndex) {
              await initiateDispute(gameContexts[i].page, 0, 'Test dispute from bot');

              console.log('  📊 Bots voting on dispute...');
              // Other bots vote
              for (let j = 1; j <= NUM_BOTS; j++) {
                if (j !== i && gameContexts[j].isBot) {
                  const vote = Math.random() > 0.5 ? 'agree' : 'disagree';
                  await voteOnDispute(gameContexts[j].page, vote);
                }
              }

              await waitForDisputeResolution(gameContexts[i].page);
              break;
            }
          }
        } catch (e) {
          console.log('  (Dispute failed, continuing...)');
        }
      }

      // Bots click continue
      console.log('\n➡️  Bots clicking continue...');
      for (let i = 1; i <= NUM_BOTS; i++) {
        if (gameContexts[i].isBot) {
          try {
            await continueToNextRound(gameContexts[i].page);
            await gameContexts[i].page.waitForTimeout(300);
          } catch (e) {
            // May already be on next screen
          }
        }
      }

      console.log('\n💡 Click "Продовжити" in YOUR window to continue...');

      roundNumber++;

      // Small delay between rounds
      await manualPage.waitForTimeout(2000);
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('🎉 TEST SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log('You can now:');
    console.log('  - Review the game end screen');
    console.log('  - Create a rematch');
    console.log('  - Or close the windows');
    console.log('\nPress Ctrl+C to end the session when ready.\n');

    // Keep the session alive for manual review
    await manualPage.waitForTimeout(300000); // 5 minutes
  });
});
