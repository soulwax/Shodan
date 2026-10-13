const test = require('node:test');
const assert = require('node:assert/strict');
const {
  coinAmountEntries,
  parseCoinNotation
} = require('../dist/services/dnd-currency.js');
const {
  walletCurrenciesAtLeast,
  walletCurrencyUpdates
} = require('../dist/services/dnd-wallet-mapping.js');

function asObject(input) {
  return Object.fromEntries(coinAmountEntries(parseCoinNotation(input)).map(([currency, amount]) => [currency, amount]));
}

test('parses the requested mixed notation into distinct currencies', () => {
  assert.deepEqual(asObject('20sp 10gp 5e'), { GP: 10n, EL: 5n, SP: 20n });
});

test('accepts case variants, commas, full names, and combines repeated denominations', () => {
  assert.deepEqual(asObject('2GP, 3 gold 4 Silver 1 platinum'), { PC: 1n, GP: 5n, SP: 4n });
});

test('updates and withdrawal guards include every requested denomination', () => {
  assert.deepEqual(walletCurrencyUpdates(parseCoinNotation('20sp 10gp'), 'decrement'), {
    silverSp: { decrement: 20n },
    goldGp: { decrement: 10n }
  });
  assert.deepEqual(walletCurrenciesAtLeast(parseCoinNotation('20sp 10gp')), {
    silverSp: { gte: 20n },
    goldGp: { gte: 10n }
  });
});

test('rejects empty, zero, negative, decimal, unknown, and trailing junk input', () => {
  for (const input of ['', '   ', '0gp', '-1gp', '1.5gp', '4xp', '2gp later', '1gp/2sp', '10g', '10s', '10el', '10c', '10p']) {
    assert.throws(() => parseCoinNotation(input), undefined, `expected rejection for ${JSON.stringify(input)}`);
  }
});

test('rejects totals beyond PostgreSQL bigint capacity, including repeated tokens', () => {
  assert.throws(() => parseCoinNotation('9223372036854775808gp'), /too large/);
  assert.throws(() => parseCoinNotation('9223372036854775807gp 1gold'), /too large/);
});
