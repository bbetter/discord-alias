# Bot Testing Mode

This testing mode launches a game with 3 automated bot players alongside your own manual window, allowing you to test the full game flow interactively.

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, run the bot testing script:**
   ```bash
   npm run test:bots
   ```

3. **Multiple browser windows will open:**
   - **Your window** (Player 1 - Host) - you control this manually
   - **Bot 1, Bot 2, Bot 3, ...** - automated players (configurable 3-10 bots)

## How It Works

### Step 1: Create Room (Manual)
- The script waits for you to:
  1. Enter your name in the guest login
  2. Click "Створити кімнату" (Create Room)
- Once the room is created, bots automatically detect the room code and join

### Step 2: Bots Join Teams (Automatic)
- Bots are distributed evenly between Team A and Team B
- Alternating pattern: Bot 1 → Team A, Bot 2 → Team B, Bot 3 → Team A, etc.
- This ensures both teams have bots, so you can join either team

### Step 3: Join Team & Start Game (Manual)
- You need to:
  1. Click "Приєднатися" on Team A or Team B
  2. Optionally configure game settings
  3. Click "Почати гру" (Start Game)

### Step 4: Play Game (Mixed)
- **When a bot is explaining:** The bot plays automatically
  - Bots mark words as correct (~70% probability) or skip (~20% probability)
  - Bots play quickly to speed up testing

- **When YOU are explaining:** You play manually in your window
  - Use your keyboard shortcuts (Space/Enter for correct, S for skip)
  - Or click the buttons

- **After each round:**
  - Bots automatically click "Продовжити" (Continue)
  - You need to click "Продовжити" in your window

- **Random disputes:** Bots may occasionally initiate disputes (~15% chance) to test that feature

### Step 5: Game End
- When a team reaches the winning score, all windows show the game end screen
- The session stays alive for 5 minutes so you can review the results
- Press `Ctrl+C` to end the session

## Features

✅ Realistic multiplayer simulation
✅ Automated bot behavior (playing, voting, continuing)
✅ Manual control for testing your interactions
✅ Visible bot windows so you can see what they're doing
✅ Console logs for tracking game flow
✅ Disputes and special game modes tested

## Bot Behavior

Bots simulate real players with:
- **70% correct rate** - marks words as correct
- **20% skip rate** - skips words
- **10% early end rate** - sometimes ends rounds early
- **Random disputes** - occasionally challenges words
- **Automatic voting** - votes on disputes randomly
- **Quick playing** - plays faster than humans for efficient testing

## Customization

Edit `tests/bot-testing.spec.ts` to customize:

```typescript
// Change number of bots (line ~58)
const NUM_BOTS = 3; // Min: 3, Max: 10
// Bots are automatically distributed evenly between teams

// Change bot behavior probabilities
await playRound(botPage, {
  maxWords: 20,              // Max words to play
  correctProbability: 0.7,   // 70% correct
  skipProbability: 0.2,      // 20% skip
});

// Change dispute probability
if (Math.random() < 0.15) {  // 15% chance
  // Initiate dispute...
}
```

### Bot Count Examples:
- **3 bots**: Team A (Bot 1), Team B (Bot 2, Bot 3) + You
- **4 bots**: Team A (Bot 1, Bot 3), Team B (Bot 2, Bot 4) + You
- **5 bots**: Team A (Bot 1, Bot 3, Bot 5), Team B (Bot 2, Bot 4) + You
- **10 bots**: Team A (Bots 1,3,5,7,9), Team B (Bots 2,4,6,8,10) + You

## Troubleshooting

**"Room not detected"**
- Make sure you clicked "Створити кімнату" in your window
- Check that the lobby screen is fully loaded

**"Bots not joining"**
- Ensure the dev server is running (`npm run dev`)
- Check that all windows loaded successfully

**"Stuck on countdown"**
- All players (you + all bots) need to be in teams before starting
- Make sure you joined a team in your window

**"Bots not clicking continue"**
- This is expected - you need to click "Продовжити" in YOUR window
- Bots only auto-continue after their delay

## Stopping the Test

Press `Ctrl+C` in the terminal running the test to stop all bots and close the windows.

## Differences from Regular Tests

| Regular Tests (`test:orchestrated`) | Bot Testing (`test:bots`) |
|-------------------------------------|---------------------------|
| All 4 players automated | 1 manual + 3-10 bots (configurable) |
| Runs to completion automatically | Waits for your actions |
| Fast execution | Interactive testing |
| No windows visible* | All windows visible |
| For CI/validation | For manual testing |

*Unless using `--headed` flag

## Use Cases

Perfect for:
- 🎮 Testing new features manually with realistic multiplayer
- 🐛 Debugging issues that require full game flow
- 🎨 Testing UI/UX with real game progression
- 🔍 Investigating edge cases with multiple players
- 📱 Testing responsive design at different stages
- 🎯 Practicing gameplay as a player

Enjoy testing! 🤖🎮
