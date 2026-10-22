# Shodan

[**Invite Shodan to your Discord server**](https://discord.com/oauth2/authorize?client_id=920659636640694293&permissions=274879081476&scope=bot%20applications.commands)

For `/members` and message-history features, enable **Server Members Intent** and **Message Content Intent** under **Bot → Privileged Gateway Intents** in the Discord Developer Portal.

Shodan is a Discord bot for D&D campaign support, AI assisted prompts, tarot readings, server moderation, and small group chat utilities. D&D characters, campaign journals, encounters, wallets, and transaction history are stored in PostgreSQL and scoped to a server campaign. Servers can use a default campaign and bind other campaigns to channels.

See the [North Star plan](docs/north-star-plan.md) for the product direction and phased roadmap.

## Features

### D&D campaign tools

- **Campaigns and access:** `/campaign create`, `list`, `show`, `default`, `bind`, `unbind`, `rename`, `archive`, and `restore` organize campaigns. Bind a campaign to a text or forum channel to use it there and in its threads. `/campaign dm-role` grants a server role access to DM-only notes; server managers retain access. Journal and session notes can be shared, DM-only, or private to their author.
- **Characters:** import a searchable PDF with `/character init`, read the saved sheet, ask AI questions, keep character memories, edit fields, and track HP with `/character hp`.
- **Campaign journal:** add typed notes, browse pages, search, show, edit, and delete entries with `/story`. `/story ask` answers from cited journal evidence. `/story interpret` creates a compact AI memory for older notes; `/story big-picture` combines and stores those memories as the campaign overview, which D&D AI commands reuse to stay consistent and reduce repeated context. New, edited, or deleted notes mark the overview stale; rebuild it with `/story big-picture`. Shared AI context uses shared notes only, and journal responses are private to the person who requested them.
- **Session loop:** DMs use `/session start` to open a session, everyone can add attributed `/session note` entries, and `/session status` shows notes and the active encounter. `/session end` drafts a recap from shared notes; `/session draft` can retrieve it later, and the DM reviews and publishes the edited recap with `/session publish` before it enters the shared journal.
- **Encounter tracker:** `/encounter start` creates an AI written scene; players use `/encounter join` to roll a d20 with their saved Dexterity modifier and enter the initiative order. DMs use `/encounter add` for foes, then advance turns, track HP, get a campaign aware twist, and save an AI recap when the encounter ends.
- **Campaign ideas:** `/quest` and `/npc` generate material from recent journal notes. Set `save:true` to keep it in the journal.
- **Adventurer bank:** `/store coins:20sp 10gp 5e` and `/withdraw coins:20sp 10gp 5e` support copper (`cp`), silver (`sp`), gold (`gp`), electrum (`e`), and platinum (`pc`). Repeated denominations are combined. `/balance` shows all five balances.
- **Character reset:** `/purge-char` removes your saved character and notes from this server's campaign.

### AI, tarot, and fun

- `/divine` supports one-card, three-card, past–present–possible-direction, yes/no leaning, decision, relationship, and Celtic Cross spreads. Draws are without replacement, every position is labeled, and replay seeds reproduce the cards, reversals, and voice. Readings are ephemeral and are not stored against a user.
- `/describe` gives an uploaded image a short narration in a chosen style. To use an image already posted in chat, right-click the post and choose **Apps → Describe image**.
- `/image` uses Luna to refine a prompt, then generates an image with OpenAI's `gpt-image-2.5-flare`; attach `base_image` to edit an existing image. **Apps → Remix image** uses an image from a selected post.
- `/speak` uses Luna to write a short line and a funny situation-based filename, then OpenAI text-to-speech creates an MP3 voice clip.
- `/roast`, `/fortune`, and `/ship` create playful AI responses. `/compliment` creates a longer, personal response and can use up to eight of the recipient's recent saved posts to ground positive character observations when they opted in to message history in this server. If no saved posts are available, it may check up to 100 recent messages in the current channel and use up to eight of the caller's own posts for a self-compliment, or the recipient's posts if that recipient opted in. Those fetched posts are not saved by the command. It does not quote or reveal the posts.
- The **Dissasociation Engine** randomly adds one fictional persona to regular AI requests. Voice and image requests do not use random personas; they use the server’s saved character when one is set. `/divine` keeps its own server-selected voice.
- `/style learn` explicitly opts in when you submit your own writing sample; `/style show` displays your profile and `/style forget` deletes it. Samples are analyzed in the bot process and discarded; only aggregate writing-pattern statistics are stored per user and server.
- `/privacy status` shows your per-server message-history consent and saved message count. Collection is **off by default**. `/privacy history-on` opts in to future messages; `/privacy history-backfill` is a separate opt-in for older accessible posts. `/privacy history-off` revokes both consents and deletes your saved message history and profile. Style profiles are separate and can be removed with `/style forget`.
- `/ai-settings` lets server managers set AI temperature, maximum output tokens, OpenAI reasoning effort, and the per-server playful meanness level and voice for non-wholesome `/divine` readings. Use `/ai-settings divine-meanness level:1` for gentle banter through `level:5` for a scathing comedic roast of the situation; the default is `2`. Use `/ai-settings divine-personality` to view this server’s saved character profile, or add `voice` to choose and persist a voice for the server. Level 5 does not target personal vulnerabilities or identity. `/divine wholesome:true` always uses the kind reading and ignores these settings.
- `/roll`, `/dice`, and `/coinflip` handle tabletop and casual rolls.

Right-click a message and choose **Apps → Save to journal** to edit a copy of its text and add it to the current campaign journal. The entry keeps a link to the source post. **Apps → Remix image** and **Apps → Describe image** work on image posts.

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

The bot requires `BOT_TOKEN`, `CLIENT_ID`, and `DATABASE_URL` to start. AI credentials are optional for non-AI commands. `/image` and `/speak` require `OPENAI_API_KEY`; other AI commands can use configured providers, tried in this order: Gemini, OpenAI, Cloudflare Workers AI, Grok, then Anthropic. Cloudflare requires both `CF_TOKEN` and `CF_ACCOUNT_ID`; it uses Workers AI for text fallback and a vision model for image requests.

OpenAI uses `gpt-6-luna`. AI generation defaults are stored per Discord server: temperature defaults to `1.0`, output tokens keep each command’s own limit unless a server-wide limit is set, and OpenAI reasoning effort defaults to `low`. OpenAI GPT-6 only accepts a temperature value when reasoning effort is `none`, so Shodan omits temperature from OpenAI requests at other reasoning levels; the temperature setting still applies to Gemini and Cloudflare.

AI requests are rate-limited per provider to 10 per minute by default, with at most two running at once and a bounded waiting queue. Set `AI_REQUESTS_PER_MINUTE` to a value from 1 to 60 to adjust the per-provider cap. Temporary HTTP 429 and 5xx responses honor `Retry-After` and receive up to two retries.

AI features send the content needed for the request to the configured AI provider. Depending on the command, this can include a question, campaign journal notes, character sheet text, an uploaded image, or (for `/compliment`) up to eight of the recipient's recent saved posts when they have opted in to message history in that server. If no saved posts are available, the command may check up to 100 recent messages in the current channel and send up to eight of the caller's own posts for a self-compliment, or the recipient's posts if that recipient opted in. It does not store these fetched posts.

`/speak` sends the prompt to Luna and the resulting text to OpenAI's text-to-speech API. Its current `gpt-4o-mini-tts` model is scheduled for shutdown on January 6, 2027; migrate the speech implementation to OpenAI's Realtime API before then.

Writing-style profiles are separate from message history and remain opt-in and server-specific. `/style learn` computes aggregate sentence, word, punctuation, contraction, and emoji statistics from the sample a user submits; the raw sample is not stored. Profiles remain in PostgreSQL until `/style forget` is used. A compact description of those statistics may be sent to the configured AI provider with that user's later requests so it can shape the response style.

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
| `pnpm test:north-star` | Build and check campaign scope, journal visibility, and divination replay behavior |
| `pnpm prisma:migrate:deploy` | Apply committed database migrations |
| `pnpm pm2:start` | Start the production process with PM2 |
| `pnpm go` | Install, migrate, build, and restart PM2 |

## Data and campaign scope

D&D records are separated by Discord server and campaign. Commands use the campaign bound to their channel or, when none is bound, the server default. Character sheets and memories belong to an individual Discord user; journal entries, sessions, and encounters belong to the campaign. Journal entries keep their source text and a stored AI interpretation. After note changes, run `/story big-picture` to refresh the shared overview; quest, NPC, and encounter prompts reuse it until the next journal change. Wallet balances are per user and campaign, and deposits and withdrawals are recorded in the database ledger.

Outside D&D campaign features, Shodan stores a user's guild display name, avatar URL, and message history only after that user opts in for that server. Tarot readings and command history are not stored. Per-command cooldowns use Discord user IDs in process memory only until the cooldown expires.

### Opting in to guild message history

Message-history collection starts **off for every user in every server**. Use `/privacy history-on` to allow storage of future messages in that server. It does not authorize importing earlier posts. To separately allow the backfill, use `/privacy history-backfill`; a server manager can then run:

```bash
pnpm prisma:migrate:deploy
pnpm history:init
```

The initializer only creates backfill profiles and imports messages for users who have both consents recorded in that server. It stores message text, channel IDs, timestamps, guild display names, and avatar URLs. It can be rerun safely: existing messages are not duplicated. Backfill covers accessible text and announcement channels; live capture stores future human-authored messages the bot receives, including in threads. Bot-authored messages, direct messages, and attachments are excluded. The bot needs the Message Content privileged intent enabled in the Discord Developer Portal and permission to view relevant channels; backfill also needs the Server Members intent and Read Message History permission. Messages the bot cannot access cannot be imported.

Messages, guild display names, and avatar URLs are stored in PostgreSQL while consent is active, with no automatic expiry. `/privacy history-off` revokes future and backfill consent and deletes that user's saved history in the server. Re-enabling future capture does not restore deleted messages; older posts require another separate backfill opt-in. The opt-in migration deletes all message-history records collected by previous default-on versions because those records do not establish consent. It leaves separately opted-in writing-style profiles intact. Server managers should explain the feature before members opt in and follow applicable privacy requirements.

Keep `.env` private and never commit API keys or bot credentials.

## License

Shodan is distributed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
