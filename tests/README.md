# Orchestrated Integration Tests for Discord Alias Game

This directory contains end-to-end integration tests for the Discord Alias game using Playwright.

## Test Files

### `orchestrated-game.spec.ts`
The original comprehensive test that simulates a full game with 4 players. This test includes all the logic inline.

### `orchestrated-game-clean.spec.ts` (Recommended)
A cleaner, more maintainable version using helper functions. This is the recommended test to run and extend.

### `helpers/game-helpers.ts`
Reusable helper functions for common game actions:
- `createRoom()` - Host creates a new game room
- `joinRoom()` - Player joins an existing room
- `joinTeam()` - Player joins a team (A or B)
- `startGame()` - Host starts the game
- `playRound()` - Play through words in a round
- `initiateDispute()` - Dispute a word from the round
- `voteOnDispute()` - Vote on a disputed word
- `continueToNextRound()` - Continue to the next round
- And more...

## What the Test Does

The orchestrated test simulates a full game with 4 players:

1. **Setup** - Creates 4 browser contexts (simulating private/incognito tabs)
2. **Room Creation** - Player 1 (host) creates a room
3. **Joining** - Players 2-4 join using the room code
4. **Team Selection** - Players 1-2 join Team A, Players 3-4 join Team B
5. **Game Start** - Host starts the game
6. **Playing Rounds** - For each round:
   - Identifies who is the explainer
   - Plays through words by randomly clicking "Вірно" (Correct) or "Пропустити" (Skip)
   - Waits for round end screen
7. **Disputes** - After each round:
   - 1-2 words are randomly disputed
   - All players vote (Agree/Disagree)
   - Resolutions are applied
8. **Continuation** - Continues to next round or ends if game is complete
9. **Cleanup** - Closes all browser contexts

## Running the Tests

### Prerequisites

Make sure the development server is running or let Playwright start it automatically (configured in `playwright.config.ts`).

### Run All Tests (Headless)

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests in Headed Mode (See the Browser)

```bash
npm run test:headed
```

### Run Only the Orchestrated Test (Recommended for Development)

```bash
npm run test:orchestrated
```

This will run the clean orchestrated test in headed mode so you can watch the game being played.

### Run Specific Test File

```bash
npx playwright test orchestrated-game-clean.spec.ts
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Timeout**: 2 minutes per test (games can take a while)
- **Workers**: 1 (tests must run sequentially for orchestration)
- **Base URL**: http://localhost:5173
- **Browser**: Chromium (Chrome)
- **Video**: Recorded on failure
- **Screenshots**: Taken on failure

## Debugging Tests

### Debug Mode

```bash
npx playwright test --debug
```

This will open the Playwright Inspector where you can step through the test.

### View Test Report

After running tests:

```bash
npx playwright show-report
```

### Console Logs

The tests include extensive console logging to track progress:
- Player actions
- Round progress
- Word plays (correct/skip)
- Disputes and voting
- Scores

## Customizing Tests

### Change Number of Rounds

Edit the test file and modify:

```typescript
const roundsToPlay = 3; // Change this number
```

### Change Word Play Probability

In `orchestrated-game-clean.spec.ts`, modify:

```typescript
const wordsPlayed = await playRound(explainerPage, 15, 0.7);
//                                                    ^^^^ 70% correct, 30% skip
```

Or in `orchestrated-game.spec.ts`:

```typescript
const randomChoice = Math.random() > 0.3; // 70% correct, 30% skip
```

### Change Number of Players

Modify the loop that creates contexts:

```typescript
for (let i = 0; i < 4; i++) { // Change 4 to desired number
  // ...
}
```

**Note**: You need at least 4 players (2 per team) for the game to start.

## Troubleshooting

### Test Times Out

- Increase the timeout in `playwright.config.ts`
- Make sure the dev server is running
- Check if the game has long round times configured

### Selectors Not Found

- The UI might have changed - update selectors in `helpers/game-helpers.ts`
- Check browser console for errors
- Use headed mode to see what's happening

### Tests Fail on CI

- Make sure Chromium is installed: `npx playwright install chromium`
- Set `CI=true` environment variable for proper configuration

## Best Practices

1. Use the helper functions from `game-helpers.ts` for new tests
2. Add new helpers for repeated actions
3. Keep test logic readable and well-commented
4. Run in headed mode during development
5. Use console logs to track test progress

## Future Improvements

- Add tests for edge cases (disconnections, timeouts)
- Test different game settings (round time, difficulty)
- Add performance metrics tracking
- Test with more players
- Add visual regression testing
- Test error handling and recovery
