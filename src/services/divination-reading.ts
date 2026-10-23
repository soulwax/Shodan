import { DIVINATION_SPREADS, getDivinationSpread } from '../data/divination-spreads';
import type { DivinationSpread } from '../data/divination-spreads';
import { getPersonaById, getPersonasForIntensity, RANDOM_PERSONA_ID } from '../data/personas';
import type { PersonaProfile } from '../data/personas';
import { DEFAULT_DIVINE_MEANNESS } from '../data/persona-intensities';
import type { Card } from '../types/card';
import { randomBoolean, randomIndex } from '../utils/random';
import { buildDivinationReplaySeed, drawUniqueCardIndices, parseDivinationReplaySeed } from './divination-draw';
import type { DivinationReplaySeed } from './divination-draw';

export interface DrawnCard {
  card: Card;
  reversed: boolean;
  position: DivinationSpread['positions'][number];
}

export interface DivinationRequest {
  question: string;
  spread: DivinationSpread;
  temperature: number;
  wholesome: boolean;
  replay: DivinationReplaySeed | null;
}

export interface DivinationReading extends Omit<DivinationRequest, 'replay'> {
  meanness: number;
  persona: PersonaProfile;
  draws: DrawnCard[];
  replaySeed: string;
}

export interface DivinationSettings {
  divineMeanness: number;
  divinePersonality: string;
}

/** Input errors may be shown directly to the person requesting the reading. */
export class DivinationInputError extends Error {}

export function parseDivinationRequest(input: {
  question: string;
  spreadId?: string | null;
  seed?: string | null;
  wholesome?: boolean | null;
}, deckSize: number): DivinationRequest {
  const question = input.question.trim();
  if (!question) throw new DivinationInputError('Add a question or thought for the cards to reflect on.');

  let replay: DivinationReplaySeed | null = null;
  if (input.seed) {
    try {
      replay = parseDivinationReplaySeed(
        input.seed,
        DIVINATION_SPREADS.map(spread => ({ id: spread.id, positionCount: spread.positions.length })),
        input.spreadId ?? null,
        deckSize
      );
    } catch (error) {
      throw new DivinationInputError(error instanceof Error
        ? error.message
        : 'That seed is malformed. Use a replay seed returned by `/divine`.');
    }
  }

  const spread = getDivinationSpread(replay?.spreadId ?? input.spreadId ?? 'one_card');
  if (!spread) throw new DivinationInputError('I couldn’t find that reading layout. Choose one of the available spreads.');
  return {
    question,
    spread,
    temperature: replay?.temperature ?? 0.7,
    wholesome: replay?.wholesome ?? input.wholesome ?? false,
    replay
  };
}

/** Resolve voices and cards independently of Discord, persistence, and AI. */
export function createDivinationReading(
  cards: Card[],
  request: DivinationRequest,
  settings: DivinationSettings | null = null
): DivinationReading {
  const { question, spread, temperature, wholesome, replay } = request;
  const meanness = replay?.meanness ?? settings?.divineMeanness ?? DEFAULT_DIVINE_MEANNESS;
  const voices = getPersonasForIntensity(meanness);
  if (!voices.length) throw new Error(`No named voices are configured for level ${meanness}.`);

  const configured = getPersonaById(settings?.divinePersonality ?? RANDOM_PERSONA_ID);
  const seededVoiceIndex = replay?.voiceIndex ?? null;
  const persona = seededVoiceIndex !== null
    ? voices[seededVoiceIndex]
    : configured?.intensity === meanness
      ? configured
      : voices[randomIndex(voices.length)];
  if (!persona) throw new Error('The selected voice does not match this reading level.');

  const cardIndices = replay?.cardIndices ?? drawUniqueCardIndices(cards.length, spread.positions.length);
  const reversals = replay?.reversed ?? spread.positions.map(() => randomBoolean());
  const draws = spread.positions.map((position, index) => ({
    position,
    card: cards[cardIndices[index]],
    reversed: reversals[index]
  }));
  if (draws.some(draw => !draw.card)) throw new Error('The replay seed refers to a card outside this deck.');

  return {
    question, spread, temperature, wholesome, meanness, persona, draws,
    replaySeed: buildDivinationReplaySeed({
      spreadId: spread.id,
      temperature,
      wholesome,
      meanness,
      voiceIndex: voices.findIndex(voice => voice.id === persona.id),
      cardIndices,
      reversed: reversals
    })
  };
}
