import { randomInt } from 'node:crypto';

export interface DivinationReplaySeed {
  spreadId: string;
  temperature: number;
  wholesome: boolean;
  meanness: number | null;
  voiceIndex: number | null;
  cardIndices: number[];
  reversed: boolean[];
  legacy: boolean;
}

export function drawUniqueCardIndices(
  deckSize: number,
  drawCount: number,
  chooseIndex: (upperExclusive: number) => number = upperExclusive => randomInt(0, upperExclusive)
): number[] {
  if (!Number.isInteger(deckSize) || !Number.isInteger(drawCount) || deckSize < 1 || drawCount < 1 || drawCount > deckSize) {
    throw new Error('The spread needs between one card and the number of cards in the deck.');
  }
  const deck = Array.from({ length: deckSize }, (_, index) => index);
  for (let index = deckSize - 1; index > 0; index -= 1) {
    const swapIndex = chooseIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new Error('The card draw source returned an invalid index.');
    }
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck.slice(0, drawCount);
}

export function parseDivinationReplaySeed(
  value: string,
  spreads: readonly { id: string; positionCount: number }[],
  expectedSpreadId: string | null,
  deckSize: number
): DivinationReplaySeed {
  const seed = value.trim();
  const legacy = /^(\d+)-(0|1)-(\d+(?:\.\d+)?)-(0|1)(?:-([1-5]))?(?:-([0-2]))?$/.exec(seed);
  if (legacy) {
    if (expectedSpreadId && expectedSpreadId !== 'one_card') {
      throw new Error('That older seed supports a one-card reading. Run `/divine` once with this spread to get a replay seed.');
    }
    const cardIndex = Number(legacy[1]);
    const temperature = Number(legacy[3]);
    if (cardIndex >= deckSize || temperature > 2) throw new Error('That seed is outside the supported card or temperature range.');
    return {
      spreadId: 'one_card',
      temperature,
      wholesome: legacy[4] === '1',
      meanness: legacy[5] ? Number(legacy[5]) : null,
      voiceIndex: legacy[6] ? Number(legacy[6]) : null,
      cardIndices: [cardIndex],
      reversed: [legacy[2] === '1'],
      legacy: true
    };
  }

  const parts = seed.split('~');
  if (parts.length !== 8 || parts[0] !== 'v2') {
    throw new Error('That seed is malformed. Use a replay seed returned by `/divine`.');
  }
  const [, spreadId, temperatureText, wholesomeText, meannessText, voiceText, indicesText, reversedText] = parts;
  const temperature = Number(temperatureText);
  const meanness = Number(meannessText);
  const voiceIndex = Number(voiceText);
  const cardIndices = indicesText.split(',').map(Number);
  const spread = spreads.find(candidate => candidate.id === spreadId);
  if (!spread) throw new Error('That seed names an unsupported spread.');
  if (expectedSpreadId && spreadId !== expectedSpreadId) throw new Error(`That seed is for the ${spreadId.replace(/_/g, ' ')} spread.`);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2 || !/^(0|1)$/.test(wholesomeText)) {
    throw new Error('That seed has invalid reading settings.');
  }
  if (!Number.isInteger(meanness) || meanness < 1 || meanness > 5 || !Number.isInteger(voiceIndex) || voiceIndex < 0 || voiceIndex > 2) {
    throw new Error('That seed has an invalid voice setting.');
  }
  if (!/^[01]+$/.test(reversedText) || reversedText.length !== cardIndices.length || cardIndices.length !== spread.positionCount) {
    throw new Error('That seed has an incomplete card draw.');
  }
  if (cardIndices.some(index => !Number.isInteger(index) || index < 0 || index >= deckSize) || new Set(cardIndices).size !== cardIndices.length) {
    throw new Error('That seed contains an invalid or repeated card.');
  }
  return {
    spreadId,
    temperature,
    wholesome: wholesomeText === '1',
    meanness,
    voiceIndex,
    cardIndices,
    reversed: [...reversedText].map(value => value === '1'),
    legacy: false
  };
}

export function buildDivinationReplaySeed(seed: Omit<DivinationReplaySeed, 'legacy'>): string {
  return [
    'v2',
    seed.spreadId,
    seed.temperature.toString(),
    seed.wholesome ? '1' : '0',
    String(seed.meanness),
    String(seed.voiceIndex),
    seed.cardIndices.join(','),
    seed.reversed.map(value => value ? '1' : '0').join('')
  ].join('~');
}
