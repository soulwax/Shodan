# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # hot-reload via ts-node-dev (inspect port 7507)
npm run build        # rimraf dist && tsc
npm start            # run compiled dist/index.js

# Linting
npm run lint         # eslint . --ext .ts
npm run lint:fix     # eslint . --ext .ts --fix

# Database (Prisma v7 + PostgreSQL)
npm run prisma:generate      # generate Prisma client after schema changes
npm run prisma:migrate        # create and apply a migration (dev)
npm run prisma:migrate:deploy # apply migrations in production
npm run prisma:push           # push schema without migration (prototyping)
npm run prisma:studio         # open Prisma Studio GUI

# Process management (production)
npm run pm2:start    # start with PM2
npm run pm2:restart  # restart PM2 process
npm run pm2:logs     # tail PM2 logs
```

## Environment Variables

Required in `.env`:
```
BOT_TOKEN=
CLIENT_ID=
TRACKING_CHANNEL_ID=
DATABASE_URL=          # or POSTGRES_PRISMA_URL (Prisma v7 reads from prisma.config.ts)
```

Optional:
```
OPENAI_API_KEY=        # needed for /divine tarot readings
LANGUAGE_CHANNEL_ID=
MUSE_API_SEARCH_ENDPOINT=
MUSE_API_MUSIC_ENDPOINT=
```

## Architecture

### Bootstrap flow

`src/index.ts` → `src/app.ts`:
1. `dotenv.config()` loads env
2. `initPrisma()` connects to PostgreSQL via the `PrismaPg` adapter
3. `setupDiscordClient()` creates the Discord.js `Client` (note: `intents: []` — add intents here when needed)
4. `registerCommands(client)` auto-discovers and registers slash commands with the Discord API
5. `registerEvents(client)` auto-discovers event handlers
6. `client.login(BOT_TOKEN)`

### Command system (`src/core/commands.ts`)

Commands are auto-discovered at startup from four fixed category folders:
- `src/commands/fun/`
- `src/commands/moderation/`
- `src/commands/tarot/`
- `src/commands/utility/`

Each file exports a default implementing `Command` (`src/types/command.ts`):
```typescript
interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | ...;
  execute: (interaction: ChatInputCommandInteraction, client: ExtendedClient) => Promise<void>;
  category?: string;
  cooldown?: number;
}
```

All commands are registered globally with the Discord REST API on every startup. There is no hot-reload for commands — restart is required to pick up new or changed command files.

### Event system (`src/core/events.ts`)

Events are auto-discovered from `src/events/guild/`, `src/events/interaction/`, `src/events/voice/`. Each file exports a default implementing `Event` with an optional `once` flag.

### Services

- **`src/services/prisma.ts`** — exports a singleton `prisma` client. Uses `PrismaPg` adapter (required by Prisma v7). Call `initPrisma()` once at startup; client auto-connects on first query in v7.
- **`src/services/openai.ts`** — OpenAI API singleton for tarot interpretations (`gpt-4-1106-preview`).
- **`src/services/database.ts`** — Higher-level DB helpers built on top of `prisma`.

### Prisma v7 specifics

`prisma.config.ts` at the project root is **required** for Prisma v7 migration commands. It loads the `DATABASE_URL` (or `POSTGRES_PRISMA_URL`) and points to `prisma/schema.prisma`. The schema itself has no `url` in the datasource block — the URL comes entirely from this config file.

### Database schema

Models: `User`, `Command`, `TarotReading`, `Guild` — all using UUIDs as primary keys (PostgreSQL). `TarotReading` has composite indexes on `userId` and `createdAt`.

### Extended client type

`src/types/client.ts` extends `discord.js Client` with `commands: Collection<string, Command>`. Import `ExtendedClient` from `src/core/client.ts` (re-exported there) throughout the codebase.

### Static assets

- `static/rider-waite/` — full Rider-Waite tarot deck images (used by `/divine`)
- `static/card-data.json` — tarot card metadata
- `static/coinflip/` — heads/tails images

Canvas (`node-canvas`) is used to rotate card images for reversed readings.
