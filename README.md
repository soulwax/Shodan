# Shodan

Shodan is a Discord bot for D&D campaign support, AI assisted prompts, tarot readings, server moderation, and small group chat utilities. D&D characters, campaign journals, encounters, wallets, and transaction history are stored in PostgreSQL and scoped to each Discord server's Main Campaign.

## Features

### D&D campaign tools

- **Characters:** import a searchable PDF with `/character init`, read the saved sheet, ask AI questions, keep character memories, edit fields, and track HP with `/character hp`.
- **Campaign journal:** add typed notes, browse pages, search, show, edit, and delete entries with `/story`. `/story ask` answers from cited journal evidence. `/story interpret` creates a compact AI memory for older notes; `/story big-picture` combines and stores those memories as the campaign overview, which D&D AI commands reuse to stay consistent and reduce repeated context. New, edited, or deleted notes mark the overview stale; rebuild it with `/story big-picture`.
- **Encounter tracker:** `/encounter start` creates an AI written scene; players use `/encounter join` to roll a d20 with their saved Dexterity modifier and enter the initiative order. DMs use `/encounter add` for foes, then advance turns, track HP, get a campaign aware twist, and save an AI recap when the encounter ends.
- **Campaign ideas:** `/quest` and `/npc` generate material from recent journal notes. Set `save:true` to keep it in the journal.
- **Adventurer bank:** `/store coins:20sp 10gp 5e` and `/withdraw coins:20sp 10gp 5e` support copper (`cp`), silver (`sp`), gold (`gp`), electrum (`e`), and platinum (`pc`). Repeated denominations are combined. `/balance` shows all five balances.
- **Character reset:** `/purge-char` removes your saved character and notes from this server's campaign.

### AI, tarot, and fun

- `/divine` draws a tarot card and offers a reading. Tarot readings are delivered in the moment and are not stored against a user.
- `/describe` gives an uploaded image a short narration in a chosen style. To use an image already posted in chat, right-click the post and choose **Apps → Describe image**.
- `/roast`, `/compliment`, `/fortune`, and `/ship` create playful AI responses.
- `/roll`, `/dice`, and `/coinflip` handle tabletop and casual rolls.

### Server and utility commands

- `/purge` clears recent messages; `/banned` and `/members` show server information.
- `/avatar`, `/echo`, `/ping`, and `/help` provide common utilities; `/example` shows a sample embed.
- `/join` joins the caller's current voice channel. It does not play music.

## Requirements

- Node.js `^20.19`, `^22.12`, or `>=24` (Prisma's supported versions)
- pnpm (the repository pins its package manager version)
- A Discord bot token and application/client ID
- A PostgreSQL database
- At least one supported AI provider credential for AI features. Credentials are optional for starting the bot, but AI commands need one to produce responses.

## Configuration

Copy `.env.example` to `.env` and set the required values:

```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Add one or more AI provider credentials. Providers are tried in this order:
OPENAI_API_KEY=
GEMINI_API_KEY=
XAI_API_KEY= # or GROK_API_KEY
ANTHROPIC_API_KEY=
CF_TOKEN=
CF_ACCOUNT_ID=
```

The bot requires `BOT_TOKEN`, `CLIENT_ID`, and `DATABASE_URL` to start. AI credentials are optional for non-AI commands. If multiple providers are configured, Shodan tries OpenAI, Gemini, Grok, Anthropic, then Cloudflare Workers AI, moving to the next configured provider when one fails. Cloudflare requires both `CF_TOKEN` and `CF_ACCOUNT_ID`; it uses Workers AI for text fallback and a vision model for image requests.

AI requests are rate-limited per provider to 10 per minute by default, with at most two running at once and a bounded waiting queue. Set `AI_REQUESTS_PER_MINUTE` to a value from 1 to 60 to adjust the per-provider cap. Temporary HTTP 429 and 5xx responses honor `Retry-After` and receive up to two retries.

AI features send the content needed for the request to the configured AI provider. Depending on the command, this can include a question, campaign journal notes, character sheet text, or an uploaded image.

## Install and run

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env with your Discord, PostgreSQL, and optional AI credentials
pnpm prisma:migrate:deploy
pnpm build
pnpm start
```

Slash commands are registered when the bot starts. For local development, use `pnpm dev`.

### PM2 deployment

`pnpm go` installs from the frozen lockfile, applies database migrations, builds the bot, and restarts the PM2 process named `Shodan`. Start that process with `pnpm pm2:start` the first time; use `pnpm go` for subsequent deployments.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Run in development mode with reloads |
| `pnpm build` | Compile TypeScript into `dist/` |
| `pnpm lint` | Check TypeScript files with ESLint |
| `pnpm test:dnd-currency` | Build and run coin notation edge-case tests |
| `pnpm prisma:migrate:deploy` | Apply committed database migrations |
| `pnpm pm2:start` | Start the production process with PM2 |
| `pnpm go` | Install, migrate, build, and restart PM2 |

## Data and campaign scope

D&D records are separated by Discord server and use that server's Main Campaign. Character sheets and memories belong to an individual Discord user; the story journal and encounter history are shared with the campaign. Journal entries keep their source text and a stored AI interpretation. After note changes, run `/story big-picture` to refresh the shared overview; quest, NPC, and encounter prompts reuse it until the next journal change. Wallet balances are per user and campaign, and deposits and withdrawals are recorded in the database ledger.

Outside D&D campaign features, Shodan does not save user profiles, tarot readings, or command history. Per-command cooldowns use Discord user IDs in process memory only until the cooldown expires.

Keep `.env` private and never commit API keys or bot credentials.

## License

Shodan is distributed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
