# Shodan North Star Plan

## North star

Shodan should be the shared companion that helps a D&D group prepare, play, and remember a campaign. It should give the DM useful tools without taking over the table, help each player manage their own character, and keep campaign answers grounded in facts the group actually recorded. Its divination tools should offer thoughtful, configurable reflection rather than claim certainty about the future.

The test for a feature is simple: does it help someone at the table in a few seconds, preserve the group's agency, and leave the campaign in a state the group can trust?

## Product promises

1. **One trustworthy campaign record.** Facts, rumors, secrets, and open questions have clear sources and visibility. AI suggestions do not become canon until a person saves or approves them.
2. **Useful to DMs and players.** DMs get preparation, pacing, and continuity help. Players get private character support and clear shared session state.
3. **Rules stay predictable.** Dice, hit points, initiative, resources, and currency use deterministic code. AI can explain or suggest, but does not silently change mechanical state.
4. **Private means private.** A character's private notes and DM-only secrets never enter a player-facing answer. Campaign memory is built from intentional campaign records, not silently inferred from general chat.
5. **Fast at the table.** Common actions have short commands, clear confirmations, and recoverable history. Longer AI work stays optional and can fail without losing saved data.

## What exists today

- D&D data is scoped to a server and stored in PostgreSQL. The schema can represent multiple campaigns, but [`getMainCampaign`](../src/services/dnd-campaign.ts) and current commands always resolve the server's `Main Campaign`; there is no campaign create/select workflow yet.
- Players can import a searchable PDF, read and ask about their own sheet, save character memories, edit a few fields, and track HP. Sheet data is AI-extracted JSON, and structured spell, equipment, condition, and resource tracking is not yet present. See [`character.ts`](../src/commands/dnd/character.ts) and the [`DndCharacter` model](../prisma/schema.prisma).
- The shared journal supports typed notes, source-post capture, editing, search, citations, per-entry interpretations, and a stored big-picture summary. [`story.ts`](../src/commands/dnd/story.ts) uses keyword matching plus recent-note fallback for questions. The summary covers at most the latest 100 entries and must be rebuilt after changes.
- Encounters support initiative, a shared roster, HP, turns, twists, and an end recap. The encounter stores current turn order as JSON with a revision check, but it does not retain a structured history of turns, actions, damage, or outcomes. See [`encounter.ts`](../src/commands/dnd/encounter.ts) and [`dnd-encounter.ts`](../src/services/dnd-encounter.ts).
- `/quest`, `/npc`, and encounters can use the campaign journal as context. Generated quests and NPCs are saved as free-text notes when requested; they do not yet have stable identities or update histories.
- `/divine` currently draws one Rider–Waite card with a random reversal and a short AI reflection. Named, level-aware voices live in the reusable [`personas.ts`](../src/data/personas.ts) registry.
- The shared AI service already has provider fallback, rate limiting, bounded concurrency, and retry handling. The test suite is currently narrow: its only test file covers D&D currency parsing.
- The README documents per-user message-history capture, opt-out controls, and the content sent to AI providers. These controls should remain visible as campaign features grow.

## Roadmap

### Phase 0 — Protect campaign state and access

Do this before adding more campaign memory or player-facing AI.

- Add campaign management: create, list, rename, archive, and select a campaign; provide a server default while allowing a command or channel to choose a different active campaign.
- Add campaign roles and visibility levels: shared canon, player-visible notes, DM-only secrets, and personal character notes. Define who can add, edit, publish, or delete each kind.
- Make every AI retrieval path apply visibility filters before building its prompt. Add tests that prove a player cannot retrieve a DM-only fact through a direct question, recap, NPC generation, or encounter twist.
- Add export and deletion paths for a campaign and its records. Keep any message-history feature separate from the intentional campaign journal.
- Add core tests around campaign scoping, visibility, dice/state transitions, encounter turns, character parsing validation, and save/delete operations.

**Ready when:** the same Discord server can run two campaigns without mixing characters, notes, wallets, encounters, or AI context; secret notes cannot appear in player output; AI failure never loses a user-saved note.

### Phase 1 — Build a data-driven divination studio

Keep `/divine` quick for a one-card reading, and make richer readings use reusable spread definitions rather than special-case prompt branches.

**First spreads**

- One card / daily reflection: the current lightweight experience.
- Three cards: situation–challenge–guidance, with past–present–possible direction as an alternate layout.
- Decision spread: one card for each option, plus hidden trade-off and a reflection prompt.
- Relationship spread: self, other, dynamic, and useful next step. Phrase this as reflection; do not claim to know another person's thoughts.
- Celtic Cross: the common ten-card layout, offered as an advanced reading with a clear position label for every card.
- Yes/no style: offer a gentle leaning with the card's reasoning and caveats, not a guaranteed prediction.

Represent each spread as data: stable ID, display name, positions, position guidance, card count, and a short interpretation method. Draw without replacement within a spread, support reversals, and keep seeded readings reproducible. Show each card and its position, then a synthesis that connects the cards instead of repeating each individual meaning. Keep traditional card data separate from generated commentary and ask one or two useful reflection questions at the end.

Reuse the persona registry for voice. Keep persona choice separate from the spread and the reading's substance; the selected meanness level constrains delivery. Keep readings ephemeral by default, and keep the existing wholesome option independent from playful voices.

**Ready when:** all spread positions render completely; the same seed reproduces the same cards, reversals, and voice; the model receives the exact position meanings and cannot silently omit cards; responses consistently distinguish symbolic interpretation from fact or certainty.

### Phase 2 — Give campaigns durable, source-backed memory

- Turn journal notes into source-backed campaign facts with stable references, dates, authors, confidence/status (established, rumor, theory, unresolved), and visibility. Add named entities for NPCs, places, factions, quests, and objects, with links to the entries that introduced or changed them.
- Replace the single manually refreshed big-picture text with layered memory: a compact campaign overview, active threads, entity summaries, and recent-session context. Each summary should record which source entries it covers and become stale automatically when those entries change.
- Improve retrieval in steps: PostgreSQL full-text search and entity aliases first; optional semantic search later if the corpus needs it. Retrieve a small, relevant set of source notes, cite claims, and have the answer say “not recorded” or identify conflicts when evidence is missing.
- Make `/quest` and `/npc` return structured drafts with stable IDs and editable details. Saving should create or update an entity and its source note, not create an unlinked paragraph every time.
- Add DM preparation views: last-session recap, active quests, unresolved clues, important NPC intentions, and likely continuity conflicts. Keep spoilers in a DM-only view.

**Ready when:** campaign questions cite the original note or entity; corrections flow through summaries; generated material can be reviewed and changed before it becomes shared canon.

### Phase 3 — Make a useful session loop for everyone

Add a session lifecycle that connects current commands instead of making the group remember a set of separate tools.

- `/session start` creates a dated session, shows a short recap and open threads, and lets the DM set a goal or tone.
- During play, `/session note` and the message context menu add quick, attributed notes. The author chooses shared, DM-only, or personal visibility. A session log records important decisions, discoveries, NPC changes, and unresolved questions.
- `/session status` shows the shared state: current scene, active encounter, party objectives, and recent decisions. `/session end` drafts a recap and next-session hooks for DM review before saving.
- Extend encounters with an event log, undo/correction history, conditions, death saves, and common resource tracking. Keep dice and state updates deterministic; make player and DM actions attributable.
- Add table-ready player actions over time: skill checks with advantage/disadvantage, rests, inspiration, conditions, spell slots or limited-use resources, and inventory/loot. Let players see and control their own character details while the DM can manage shared encounter state.
- Add a party view for shared facts and session decisions without exposing private player notes or DM secrets.

**Ready when:** a group can start, play, and close a session with current notes and state preserved; both player and DM actions are easy to find; recap facts come from the event log and reviewed notes, not invented scenes.

### Phase 4 — Broaden systems and table integrations

- Use the existing campaign `gameSystem` field to support explicit ruleset profiles. Start with the ruleset the group uses, encode common arithmetic and trackers in deterministic services, and keep AI rules answers clearly sourced and version-aware.
- Add optional Discord-native surfaces where they reduce command friction: a persistent encounter board, buttons for next turn and HP changes, and campaign/session threads. Commands remain available for accessibility and recovery.
- Consider additional divination systems such as oracle decks or runes only after the spread engine and user demand are established. Treat each as a separate, data-driven method with its own meanings and limits.
- Review AI provider and media-model lifecycles regularly; graceful fallback should not imply that providers share identical capabilities or data handling.

## Architecture rules for future work

- Keep canonical game state in typed database records; use AI only for drafts, summaries, and explanations.
- Store structured changes as events where history matters. A user should be able to correct an action and understand how state changed.
- Pass campaign ID, user ID, and visibility scope explicitly through retrieval. Do not rely on a server-wide prompt containing every campaign fact.
- Give generated content an approval path (`draft → reviewed → saved`) when it changes shared canon. Do not auto-save private inference as fact.
- Bound context with retrieval and source references. Do not solve long campaigns by continually appending more text to a prompt.
- Use opt-in feedback and privacy-respecting aggregate health measures. Do not add hidden message collection as a shortcut to campaign memory.

## How to measure progress

- **Trust:** campaign answers cite evidence; correction and deletion reliably invalidate affected memory; tests cover secret isolation and cross-campaign isolation.
- **At-table usefulness:** the common session actions finish in one short interaction; initiative and HP state remain consistent under simultaneous commands; players can find their own character and current objectives.
- **Divination quality:** chosen spread positions are all represented; seeded draws are reproducible; readings connect cards to the question without presenting predictions as facts.
- **Reliability:** AI/provider outages leave deterministic commands and saved records working; queues and user-facing errors remain understandable; command and migration coverage grows with each data feature.
- **Adoption:** ask groups for opt-in feedback after real sessions. Prefer “did this save time or preserve something useful?” over collecting raw channel activity.

## Recommended first three deliverables

1. Campaign create/select plus a visibility and DM-role model.
2. A three-card reading and a decision spread built from shared spread data, with seed and output-shape checks.
3. A minimal `/session start`, `/session note`, `/session status`, and `/session end` flow backed by attributed session records and a reviewed recap.

These establish a safe scope for campaign intelligence, give the divination feature a clear path beyond one-card readings, and create a useful loop for DMs and players without requiring a large rules engine up front.
