const test = require('node:test');
const assert = require('node:assert/strict');

const { DIVINATION_SPREADS } = require('../dist/data/divination-spreads.js');
const {
  buildDivinationReplaySeed,
  drawUniqueCardIndices,
  parseDivinationReplaySeed
} = require('../dist/services/divination-draw.js');
const { parseDivinationRequest, createDivinationReading, DivinationInputError } = require('../dist/services/divination-reading.js');
const { getPersonasForIntensity } = require('../dist/data/personas.js');
const { loadAIConfiguration } = require('../dist/config/ai.js');
const tarotCards = require('../dist/data/tarot-deck.js').loadTarotDeck();
const { campaignChannelScope } = require('../dist/utils/dnd-campaign-scope.js');
const { visibleStoryWhere } = require('../dist/utils/dnd-visibility.js');
const { splitLongText } = require('../dist/utils/text.js');
const { getQuestionSearchTerms, rankCampaignStoryEntries } = require('../dist/utils/dnd-story-search.js');
const { DndStoryVisibility } = require('@prisma/client');

test('common divination spreads have complete, stable position data', () => {
  const ids = new Set(DIVINATION_SPREADS.map(spread => spread.id));
  assert.equal(ids.size, DIVINATION_SPREADS.length);
  assert.ok(['one_card', 'three_card', 'past_present_future', 'yes_no', 'decision', 'relationship', 'celtic_cross']
    .every(id => ids.has(id)));
  for (const spread of DIVINATION_SPREADS) {
    assert.ok(spread.positions.length > 0, `${spread.id} has positions`);
    assert.equal(new Set(spread.positions.map(position => position.id)).size, spread.positions.length);
    assert.ok(spread.positions.every(position => position.name && position.guidance));
  }
  assert.equal(DIVINATION_SPREADS.find(spread => spread.id === 'celtic_cross').positions.length, 10);
});

test('card draws are unique and reject impossible spread sizes', () => {
  const draw = drawUniqueCardIndices(5, 5, upperExclusive => upperExclusive - 1);
  assert.deepEqual(draw, [0, 1, 2, 3, 4]);
  assert.equal(new Set(drawUniqueCardIndices(78, 10)).size, 10);
  assert.throws(() => drawUniqueCardIndices(3, 4), /between one card/);
  assert.throws(() => drawUniqueCardIndices(3, 0), /between one card/);
});

test('version 2 replay seeds preserve all draw and voice settings', () => {
  const settings = {
    spreadId: 'decision',
    temperature: 0.7,
    wholesome: false,
    meanness: 4,
    voiceIndex: 2,
    cardIndices: [4, 18, 27, 39, 66],
    reversed: [false, true, false, true, true]
  };
  const seed = buildDivinationReplaySeed(settings);
  const parsed = parseDivinationReplaySeed(seed, DIVINATION_SPREADS.map(spread => ({
    id: spread.id,
    positionCount: spread.positions.length
  })), 'decision', 78);
  assert.equal(parsed.legacy, false);
  assert.deepEqual({ ...parsed, legacy: undefined }, { ...settings, legacy: undefined });
});

test('replay seeds reject spread mismatch, repeated cards, and malformed draws', () => {
  const spreads = DIVINATION_SPREADS.map(spread => ({ id: spread.id, positionCount: spread.positions.length }));
  const valid = buildDivinationReplaySeed({
    spreadId: 'three_card', temperature: 0.7, wholesome: true, meanness: 2,
    voiceIndex: 0, cardIndices: [1, 2, 3], reversed: [false, false, true]
  });
  assert.throws(() => parseDivinationReplaySeed(valid, spreads, 'decision', 78), /for the three card spread/);
  assert.throws(() => parseDivinationReplaySeed('v2~three_card~0.7~1~2~0~1,1,3~001', spreads, null, 78), /invalid or repeated card/);
  assert.throws(() => parseDivinationReplaySeed('v2~three_card~0.7~1~2~0~1,2~01', spreads, null, 78), /incomplete card draw/);
});

test('older one-card replay seeds remain supported', () => {
  const spreads = DIVINATION_SPREADS.map(spread => ({ id: spread.id, positionCount: spread.positions.length }));
  const parsed = parseDivinationReplaySeed('59-0-0.7-0-5', spreads, null, 78);
  assert.equal(parsed.legacy, true);
  assert.deepEqual(parsed.cardIndices, [59]);
  assert.deepEqual(parsed.reversed, [false]);
  assert.throws(() => parseDivinationReplaySeed('59-0-0.7-0-5', spreads, 'decision', 78), /older seed supports a one-card/);
});

test('reading preparation preserves seeded cards, reversals, voice, and seed', () => {
  const seed = buildDivinationReplaySeed({
    spreadId: 'three_card',
    temperature: 0.7,
    wholesome: true,
    meanness: 2,
    voiceIndex: 1,
    cardIndices: [0, 3, 7],
    reversed: [true, false, true]
  });
  const request = parseDivinationRequest({ question: '  What should I consider?  ', seed }, tarotCards.length);
  const reading = createDivinationReading(tarotCards, request);

  assert.equal(reading.question, 'What should I consider?');
  assert.equal(reading.persona.id, getPersonasForIntensity(2)[1].id);
  assert.deepEqual(reading.draws.map(draw => draw.reversed), [true, false, true]);
  assert.deepEqual(reading.draws.map(draw => draw.card), [tarotCards[0], tarotCards[3], tarotCards[7]]);
  assert.equal(reading.replaySeed, seed);
  assert.throws(() => parseDivinationRequest({ question: '   ' }, tarotCards.length), DivinationInputError);
});

test('AI configuration trims credentials, respects provider aliases, and uses safe defaults', () => {
  const configured = loadAIConfiguration({
    OPENAI_API_KEY: ' openai-key ',
    XAI_API_KEY: ' xai-key ',
    GROK_API_KEY: ' fallback-key ',
    CF_TOKEN: ' cloudflare-token ',
    AI_REQUESTS_PER_MINUTE: '17'
  });
  assert.equal(configured.apiKeys.openai, 'openai-key');
  assert.equal(configured.apiKeys.grok, 'xai-key');
  assert.equal(configured.apiKeys.cloudflare, undefined);
  assert.equal(configured.requestsPerMinute, 17);

  const defaults = loadAIConfiguration({});
  assert.equal(defaults.requestsPerMinute, 10);
  assert.deepEqual(defaults.apiKeys, {
    openai: undefined,
    gemini: undefined,
    grok: undefined,
    anthropic: undefined,
    cloudflare: undefined
  });
});

test('thread campaign routing checks the thread before its parent', () => {
  assert.deepEqual(campaignChannelScope('thread-1', 'forum-1'), ['thread-1', 'forum-1']);
  assert.deepEqual(campaignChannelScope('channel-1'), ['channel-1']);
  assert.deepEqual(campaignChannelScope('channel-1', 'channel-1'), ['channel-1']);
});

test('journal visibility filters secrets and personal notes before retrieval', () => {
  const matches = (where, entry) => where.OR.some(rule =>
    (rule.visibility === undefined || rule.visibility === entry.visibility) &&
    (rule.discordUserId === undefined || rule.discordUserId === entry.discordUserId));
  const shared = { visibility: DndStoryVisibility.SHARED, discordUserId: 'other' };
  const dmOther = { visibility: DndStoryVisibility.DM_ONLY, discordUserId: 'other' };
  const privateOther = { visibility: DndStoryVisibility.PRIVATE, discordUserId: 'other' };
  const dmMine = { visibility: DndStoryVisibility.DM_ONLY, discordUserId: 'player' };
  const privateMine = { visibility: DndStoryVisibility.PRIVATE, discordUserId: 'player' };
  const playerScope = visibleStoryWhere('player', false);
  const dmScope = visibleStoryWhere('dm', true);

  assert.equal(matches(playerScope, shared), true);
  assert.equal(matches(playerScope, dmOther), false);
  assert.equal(matches(playerScope, privateOther), false);
  assert.equal(matches(playerScope, dmMine), true);
  assert.equal(matches(playerScope, privateMine), true);
  assert.equal(matches(dmScope, dmOther), true);
  assert.equal(matches(dmScope, privateOther), false);
});

test('long Discord fields stay within the configured limit without cutting long words', () => {
  const prose = 'The lantern keeper studies old maps by candlelight. '.repeat(80).trim();
  const proseParts = splitLongText(prose);
  assert.ok(proseParts.every(part => part.length <= 1024));
  assert.equal(proseParts.join(' '), prose);

  const unbrokenWord = 'x'.repeat(2500);
  const wordParts = splitLongText(unbrokenWord);
  assert.ok(wordParts.every(part => part.length <= 1024));
  assert.equal(wordParts.join(''), unbrokenWord);
});

test('journal question search removes common words and ranks matching notes first', () => {
  const terms = getQuestionSearchTerms('What did the lantern keeper find in the observatory?');
  assert.deepEqual(terms, ['lantern', 'keeper', 'find', 'observatory']);

  const recent = { id: 'recent', content: 'A keeper watches the docks.', interpretation: null, createdAt: new Date('2026-01-02') };
  const matching = { id: 'matching', content: 'A lantern burns inside the observatory.', interpretation: null, createdAt: new Date('2026-01-01') };
  const unrelated = { id: 'unrelated', content: 'The bell rings at midnight.', interpretation: null, createdAt: new Date('2026-01-03') };
  assert.deepEqual(rankCampaignStoryEntries([recent, matching, unrelated], terms).map(entry => entry.id), ['matching', 'recent', 'unrelated']);
});
