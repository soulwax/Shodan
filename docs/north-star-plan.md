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

- D&D data is stored in PostgreSQL and scoped to a campaign. `/campaign` can create, list, rename, archive, restore, and set the default campaign; channels and their threads can be bound to a campaign. D&D commands resolve the channel campaign first, then the server default. See [`dnd-campaign.ts`](../src/services/dnd-campaign.ts) and [`campaign.ts`](../src/commands/dnd/campaign.ts).
- Players can import a searchable PDF, read and ask about their own sheet, save character memories, edit a few fields, and track HP. Sheet data is AI-extracted JSON, and structured spell, equipment, condition, and resource tracking is not yet present. See [`character.ts`](../src/commands/dnd/character.ts) and the [`DndCharacter` model](../prisma/schema.prisma).
- The journal supports typed notes, source-post capture, editing, search, citations, per-entry interpretations, and a stored big-picture summary. Notes have shared, DM-only, or author-private visibility; player-facing AI context is built from shared notes only, and journal responses are ephemeral. [`story.ts`](../src/commands/dnd/story.ts) still uses keyword matching plus recent-note fallback for questions. The summary covers at most the latest 100 shared entries and must be rebuilt after changes.
- Encounters support initiative, a shared roster, HP, turns, twists, and an end recap. The encounter stores current turn order as JSON with a revision check, but it does not retain a structured history of turns, actions, damage, or outcomes. See [`encounter.ts`](../src/commands/dnd/encounter.ts) and [`dnd-encounter.ts`](../src/services/dnd-encounter.ts).
- `/quest`, `/npc`, and encounters can use the campaign journal as context. Generated quests and NPCs are saved as free-text notes when requested; they do not yet have stable identities or update histories.
- `/divine` offers one-card, three-card, past–present–possible-direction, yes/no, decision, relationship, and Celtic Cross spreads. Draws are without replacement, each position is shown, and replay seeds preserve the draw and named voice. Readings are ephemeral. Named, level-aware voices live in the reusable [`personas.ts`](../src/data/personas.ts) registry.
- `/session` starts a campaign session, records attributed notes with visibility, shows current session and encounter state, and drafts a recap from shared notes. A DM must review and publish the recap before it becomes a shared journal entry. See [`dnd-session.ts`](../src/services/dnd-session.ts).
- The shared AI service already has provider fallback, rate limiting, bounded concurrency, and retry handling. Tests cover currency parsing plus campaign channel scope, journal visibility rules, spread definitions, and replay seeds. Database integration and Discord command-flow coverage are still missing.
- The README documents per-user message-history capture, opt-out controls, and the content sent to AI providers. These controls should remain visible as campaign features grow.

### Execution progress

The first execution pass delivered campaign/channel selection and note visibility, replayable multi-card spreads, and a minimal session lifecycle with a DM-reviewed recap. The current DM role is server-wide, so campaigns with different DMs still need separate role scopes. Campaign export/deletion, archive guards, database integration coverage, entity-based memory, encounter event history, and expanded player actions remain ahead.

## Next execution sequence

Build these milestones in order. Each one creates a reliable base for the next, and each can ship independently.

### Milestone 1 — Finish campaign trust and lifecycle controls

**Outcome:** campaign permissions and lifecycle actions remain isolated when a server hosts multiple groups.

- Move the DM role from `DndServer` to `DndCampaign`. Backfill the current server role onto existing campaigns during migration so current access carries over; after migration, authorization checks use only the selected campaign’s role.
- Make `/campaign dm-role` and `/campaign show` operate on the campaign routed from the current channel, with the server default applying in unbound channels.
- Prevent archiving a campaign with an active encounter or session. Explain what needs to be closed first.
- Add a private JSON campaign export that reports its visibility scope. Include shared notes for authorized members, DM-only notes for that campaign’s DM role, and personal notes only for their authors. Add a separately confirmed delete action for server managers, with the campaign name and affected-record counts shown before deletion.
- Add database-backed tests for campaign routing, role authorization, archive rules, exports, deletes, and isolation between two campaigns in one server.

**Acceptance:** a role assigned to one campaign cannot read another campaign’s secrets; an export never crosses campaign IDs or note visibility; deleting one campaign leaves the server’s other campaigns intact; active play cannot be archived accidentally.

**First slice:** migrate and backfill the per-campaign DM role, thread the campaign ID through every authorization check, and add a two-campaign access test. Then add active-session/encounter archive guards before implementing export and deletion.

### Milestone 2 — Turn the journal into source-backed campaign canon

**Outcome:** campaign facts have stable identities, sources, status, and correction history.

- Add typed entities for NPCs, locations, factions, quests, and important objects, with aliases and links to the journal entries that introduced or changed them.
- Represent each fact’s status as established, rumor, theory, or unresolved, and retain its author, date, source, and visibility. Corrections append a change record and invalidate affected summaries.
- Change `/npc` and `/quest` into reviewable drafts. Saving creates or updates an entity and source entry; it does not silently turn generated text into canon.
- Replace keyword-only `/story ask` selection with PostgreSQL full-text search plus entity aliases. Return a small set of source entries and cite each supported answer. Show conflicts and missing facts explicitly.
- Generate campaign overviews and active-thread summaries from source references, and rebuild only summaries affected by changed entries.
- Add DM preparation views for recent events, active quests, unresolved clues, and relevant NPCs, with visibility applied before prompt construction.

**Acceptance:** every campaign answer can be followed to its source; a correction or deletion updates related entity views and summaries; generated NPCs and quests remain drafts until a person saves them; player answers contain no DM-only facts.

### Milestone 3 — Make sessions and encounters recoverable

**Outcome:** the group can follow what happened during a session and correct mechanical actions safely.

- Add a session-note context menu action so players can capture a post into the active session with the same shared, DM-only, and private choices as `/session note`.
- Connect the session start view to the last reviewed recap and active threads. Include note references in recap drafts so a DM can verify each claim.
- Add a typed encounter event table for initiative changes, turn advances, damage, healing, removals, and encounter end. Record the Discord user and interaction ID for each action.
- Make each mechanical update and event write atomic. Add undo or correction actions that append a compensating event instead of erasing history.
- Extend encounter status with current turn, scene, and recent events. Add conditions and death saves after event history is in place.
- Test simultaneous updates, retries, duplicate interactions, recap source coverage, and visibility boundaries.

**Acceptance:** retries cannot apply damage twice; every displayed state change has an attributable event; corrections preserve the original event and current state; session recaps cite recorded notes and require DM review.

### Milestone 4 — Add dependable player character actions

**Outcome:** players can use their saved character at the table without making the AI authoritative over rules or state.

- Validate imported sheets against a typed schema and show unresolved fields for player correction before saving.
- Add a campaign rules profile based on `gameSystem`; begin with the ruleset the group selects and keep arithmetic deterministic.
- Add common player actions in small slices: ability checks with advantage/disadvantage, rests, inspiration, conditions, and limited-use resources.
- Define ownership clearly: players update their own character resources; DMs can correct campaign encounter state; every update has a recoverable history.
- Add fixtures for imported sheet shapes and tests for rules arithmetic, ownership, resource limits, and concurrent updates.

**Acceptance:** imported fields are validated and editable; command results are deterministic and tied to the selected rules profile; AI can explain a result but cannot change a character or encounter value.

### Milestone 5 — Improve table UX from observed use

**Outcome:** frequent actions take fewer steps while preserving command accessibility and recovery.

- After the command workflows are stable, add optional persistent Discord controls for encounter turns and common HP changes.
- Add a party view that separates shared state, each player’s own notes, and DM-only preparation.
- Gather opt-in feedback after real sessions about time saved, recap accuracy, and missing actions. Use it to choose the next command rather than collecting channel conversations.
- Review AI provider/model changes and disclose which command content is sent to which provider.

**Acceptance:** controls remain usable after bot restarts, slash commands remain available, and changes are prioritized from explicit group feedback.

### Divination follow-up

Maintain the current spread registry and improve it with replay/output regression fixtures, clearer card-position diagrams, and opt-in feedback on usefulness. Add another divination system only after the tarot spreads have real use; keep its meanings and constraints in its own data set. Do not store questions or readings for product analytics.

## Roadmap

### Phase 0 — Protect campaign state and access (foundation delivered; Milestone 1 remains)

Do this before adding more campaign memory or player-facing AI.

- Campaign creation, defaults, channel binding, archiving, and restoration are implemented. The per-campaign DM role, active-play archive guard, export, and deletion remain.
- Shared, DM-only, and private journal/session notes are implemented. Expand authorization tests to database-backed command paths and multiple campaigns.
- Keep AI retrieval filters in place before prompt assembly. Cover direct questions, recaps, NPC generation, and encounter twists with integration tests.
- Keep message-history controls separate from intentional campaign records.
- Expand automated coverage to dice/state transitions, encounter turns, character parsing validation, and save/delete operations.

**Ready when:** the same Discord server can run two campaigns without mixing characters, notes, wallets, encounters, or AI context; secret notes cannot appear in player output; AI failure never loses a user-saved note.

### Phase 1 — Build a data-driven divination studio (core delivered)

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

### Phase 2 — Give campaigns durable, source-backed memory (next after Milestone 1)

- Turn journal notes into source-backed campaign facts with stable references, dates, authors, confidence/status (established, rumor, theory, unresolved), and visibility. Add named entities for NPCs, places, factions, quests, and objects, with links to the entries that introduced or changed them.
- Replace the single manually refreshed big-picture text with layered memory: a compact campaign overview, active threads, entity summaries, and recent-session context. Each summary should record which source entries it covers and become stale automatically when those entries change.
- Improve retrieval in steps: PostgreSQL full-text search and entity aliases first; optional semantic search later if the corpus needs it. Retrieve a small, relevant set of source notes, cite claims, and have the answer say “not recorded” or identify conflicts when evidence is missing.
- Make `/quest` and `/npc` return structured drafts with stable IDs and editable details. Saving should create or update an entity and its source note, not create an unlinked paragraph every time.
- Add DM preparation views: last-session recap, active quests, unresolved clues, important NPC intentions, and likely continuity conflicts. Keep spoilers in a DM-only view.

**Ready when:** campaign questions cite the original note or entity; corrections flow through summaries; generated material can be reviewed and changed before it becomes shared canon.

### Phase 3 — Make a useful session loop for everyone (minimal loop delivered; Milestone 3 extends it)

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

## Original first three deliverables

1. Campaign create/select plus a visibility and DM-role model.
2. A three-card reading and a decision spread built from shared spread data, with seed and output-shape checks.
3. A minimal `/session start`, `/session note`, `/session status`, and `/session end` flow backed by attributed session records and a reviewed recap.

These were delivered in the first execution pass. Start the next pass with Milestone 1’s per-campaign role migration and cross-campaign access test. Then finish lifecycle controls, establish source-backed canon, and make session and encounter history recoverable.
