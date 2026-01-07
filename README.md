# 

A multiplayer word-guessing game for Discord Activities where teams compete by explaining Ukrainian words without using similar-sounding or related terms.

## Features

- Team-based multiplayer gameplay (flexible team sizes: 2-6 players per team)
- Manual team selection
- Configurable round timers (30s, 60s, 90s, or 120s)
- Categorized Ukrainian word bank:
  - Тварини (Animals)
  - Предмети (Objects)
  - Дії (Actions)
  - Місця (Places)
  - Різне (Misc)
- Three difficulty levels: легкі, середні, складні
- Real-time multiplayer using WebSockets
- Discord SDK integration for player avatars and authentication

## Setup

### Quick Start (Local Testing)

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your Discord credentials to `.env`:
```
VITE_DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:5176/ in your browser to test locally (mock mode)

### Discord Integration

To run as a Discord Activity inside Discord:

📖 **See detailed instructions in [DISCORD_SETUP.md](./DISCORD_SETUP.md)**

Quick summary:
1. Get your Client Secret from Discord Developer Portal
2. Set up URL mappings using cloudflared or ngrok
3. Build and deploy: `npm run build && npm start`
4. Launch from Discord Activities menu

## Project Structure

```
discord-alias/
├── client/               # Frontend code
│   ├── index.html
│   ├── js/              # JavaScript modules
│   └── styles/          # CSS files
├── server/              # Backend code
│   ├── index.js         # Express + Socket.io server
│   ├── game-manager.js  # Game state management
│   ├── socket-handler.js # WebSocket event handlers
│   ├── word-loader.js   # Word bank loader
│   └── words/           # Ukrainian word banks (txt files)
└── package.json
```

## Word Bank Format

Each word file (in `server/words/`) uses the format:
```
word|difficulty
кіт|easy
жираф|medium
аксолотль|hard
```

## Technologies

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **Real-time**: Socket.io
- **Discord**: @discord/embedded-app-sdk
- **Build**: Vite

## License

MIT
