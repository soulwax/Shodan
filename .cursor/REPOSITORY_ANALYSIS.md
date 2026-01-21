# SHODAN Discord Bot - Repository Analysis

## 📋 Project Overview

**SHODAN** is a feature-rich Discord bot built with TypeScript and Discord.js. It's a private, multi-purpose bot that emphasizes privacy (no logging) and offers a variety of commands including tarot readings, moderation tools, fun commands, and utility functions. The bot integrates with OpenAI for AI-powered tarot interpretations.

- **Version**: 0.8.1
- **License**: GPL-3.0-only
- **Author**: soulwax
- **Repository**: https://github.com/soulwax/Shodan

## 🏗️ Architecture

### Core Structure

The bot follows a modular, event-driven architecture:

1. **Bootstrap Flow** (`src/app.ts` → `src/index.ts`)
   - Initializes environment variables
   - Connects to MongoDB via Prisma
   - Sets up Discord client
   - Registers commands and events
   - Logs into Discord

2. **Command System** (`src/core/commands.ts`)
   - Auto-discovers commands from category folders
   - Supports both legacy JS and TypeScript commands
   - Automatically registers commands with Discord API
   - Commands stored in `client.commands` Collection

3. **Event System** (`src/core/events.ts`)
   - Auto-discovers events from category folders
   - Supports both `once` and regular event handlers
   - Organized by event type (guild, interaction, voice)

4. **Service Layer**
   - **OpenAI Service**: Singleton service for AI completions
   - **Prisma Service**: Database connection and ORM
   - **Database Service**: (Referenced but not yet reviewed)

### File Structure

```
src/
├── app.ts                 # Application bootstrap
├── index.ts              # Entry point
├── commands/             # Bot commands
│   ├── definitions/      # Command definitions (legacy JS)
│   ├── fun/              # Fun commands (coinflip, dice, roll)
│   ├── moderation/       # Moderation commands (purge, banned, members)
│   ├── tarot/            # Tarot commands (divine, history)
│   └── utility/          # Utility commands (avatar, echo, ping, help, join, muse)
├── config/               # Configuration
│   ├── discord.ts        # Discord configuration
│   └── environment.ts    # Environment variable validation (Zod)
├── core/                 # Core functionality
│   ├── client.ts         # Discord client setup
│   ├── commands.ts       # Command registration
│   └── events.ts         # Event registration
├── events/               # Event handlers
│   ├── definitions/      # Event definitions
│   ├── guild/           # Guild events (ready)
│   ├── interaction/     # Interaction events (interactionCreate)
│   └── voice/           # Voice events (voiceService)
├── services/             # External services
│   ├── database.ts       # Database service
│   ├── openai.ts         # OpenAI API service
│   └── prisma.ts         # Prisma ORM service
├── types/                # TypeScript definitions
│   ├── card.ts           # Tarot card types
│   ├── client.ts         # Extended client types
│   ├── command.ts        # Command interface
│   ├── environment.ts    # Environment types
│   └── event.ts          # Event interface
└── utils/                # Utility functions
    ├── embed.ts          # Embed helpers
    ├── logger.ts         # Winston logger
    └── random.ts         # Random utilities
```

## 🔧 Key Technologies

### Core Dependencies

- **discord.js** (^14.25.1) - Discord API library
- **TypeScript** (^5.9.3) - Type safety
- **Prisma** (^7.3.0) - MongoDB ORM
- **OpenAI** (^4.104.0) - AI completions
- **Winston** (^3.19.0) - Logging
- **Zod** (^3.25.76) - Environment variable validation
- **Canvas** (3.1.0) - Image manipulation for tarot cards
- **@discordjs/voice** (0.18.0) - Voice channel support

### Development Tools

- **ts-node-dev** - Hot reloading in development
- **ESLint** - Code linting
- **PM2** - Process management (production)

## 📊 Database Schema (Prisma/MongoDB)

### Models

1. **User**
   - Stores Discord user information
   - Tracks commands and tarot readings
   - Fields: discordId (unique), username, discriminator, avatar

2. **Command**
   - Tracks command usage
   - Stores command name, user, guild, arguments (JSON)
   - Linked to User model

3. **TarotReading**
   - Stores tarot reading history
   - Fields: cardName, isReversed, question, interpretation, seed
   - Linked to User model

4. **Guild**
   - Guild-specific settings
   - Fields: prefix, welcomeMessage, welcomeChannelId, modLogChannelId

## 🎯 Main Features

### 1. Tarot & Divination (`/divine`)
- **AI-Powered Readings**: Uses OpenAI GPT-4 for personalized interpretations
- **Card Selection**: Random selection from full Rider-Waite deck
- **Reversal Support**: Cards can be upright or reversed
- **Tone Options**: Wholesome or sarcastic readings
- **Seed System**: Reproducible readings via seed parameter
- **Image Processing**: Uses Canvas to rotate reversed cards
- **Database Persistence**: Saves readings to MongoDB

### 2. Moderation Tools
- `/purge` - Bulk message deletion
- `/banned` - View banned users
- `/members` - Member list management

### 3. Fun Commands
- `/coinflip` - Visual coin flip with images
- `/dice` - Custom dice rolling
- `/roll` - Standard NdX dice format (e.g., 2d6)

### 4. Utility Commands
- `/avatar` - Display user avatars
- `/echo` - Repeat messages
- `/ping` - Latency check
- `/help` - Command list
- `/join` - Voice channel joining
- `/muse` - Music search (WIP)

## 🎨 Design Patterns

### 1. Command Pattern
- Commands implement `Command` interface
- Each command has `data` (SlashCommandBuilder) and `execute` function
- Optional `category` and `cooldown` properties

### 2. Event Pattern
- Events implement `Event` interface
- Support for `once` and regular event handlers
- Auto-discovery from category folders

### 3. Service Pattern
- Singleton services (OpenAI, Prisma)
- Centralized configuration and initialization

### 4. Type Safety
- Strong TypeScript typing throughout
- Zod validation for environment variables
- Extended Discord.js types for custom client properties

## 🔐 Environment Variables

Required:
- `BOT_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `TRACKING_CHANNEL_ID` - Channel for tracking
- `MONGODB_URL` - MongoDB connection string

Optional:
- `OPENAI_API_KEY` - For tarot readings
- `LANGUAGE_CHANNEL_ID` - Language channel
- `MUSE_API_SEARCH_ENDPOINT` - Music API
- `MUSE_API_MUSIC_ENDPOINT` - Music API

## 📝 Notable Implementation Details

### Command Registration
- Supports both legacy JS commands (root `commands/` directory)
- TypeScript commands in category subdirectories
- Automatic Discord API registration via REST API
- Command categorization and counting

### Error Handling
- Comprehensive try-catch blocks
- Graceful error messages to users
- Detailed logging via Winston
- Database errors don't interrupt user experience

### Image Processing
- Uses Canvas library for image manipulation
- Supports card reversal via rotation
- Handles missing images gracefully

### AI Integration
- Custom prompts for sarcastic vs wholesome readings
- Temperature and token control
- Model: `gpt-4-1106-preview`

### Logging
- Winston logger with colored console output
- File logging in production
- Different log levels (debug, info, warn, error)
- Prisma query logging

## 🚀 Development Workflow

### Scripts
- `npm run dev` - Development with hot reloading (ts-node-dev)
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled code
- `npm run lint` - Lint check
- `npm run lint:fix` - Auto-fix linting issues
- `npm run pm2:*` - PM2 process management

### TypeScript Configuration
- Target: ES2020
- Module: NodeNext
- Strict mode enabled
- Source maps enabled
- Output: `dist/` directory

## 🔍 Code Quality

### Strengths
- ✅ Strong TypeScript typing
- ✅ Modular architecture
- ✅ Comprehensive error handling
- ✅ Environment variable validation
- ✅ Detailed logging
- ✅ Privacy-focused (no logging mentioned in README)
- ✅ Well-organized file structure
- ✅ Copyright headers in files

### Areas for Potential Improvement
- Client intents are empty in `client.ts` (line 30) - may need configuration
- Mixed use of `require()` and ES modules in command/event loading
- Some duplicate code in environment validation
- Database service file exists but not reviewed

## 📦 Static Assets

- **Tarot Cards**: Full Rider-Waite deck images in `static/rider-waite/`
- **Card Data**: JSON file with card metadata in `static/card-data.json`
- **Coinflip Images**: Heads/tails images in `static/coinflip/`

## 🎯 Future Considerations

- Voice service implementation (file exists but not reviewed)
- Music search functionality (WIP)
- Command cooldown system (interface supports it)
- More AI-powered features
- Additional moderation tools

---

**Last Updated**: Repository analysis generated via `/init` command
**Analysis Date**: 2025
