const {
  randomBytes: cryptoRandomBytes,
  randomInt: cryptoRandomInt,
  randomUUID: cryptoRandomUUID
} = require('node:crypto')

function randomInteger(minInclusive, maxInclusive) {
  const maxExclusive = maxInclusive + 1
  if (
    !Number.isSafeInteger(minInclusive) ||
    !Number.isSafeInteger(maxInclusive) ||
    minInclusive > maxInclusive ||
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive - minInclusive >= 2 ** 48
  ) {
    throw new RangeError('Random integer bounds must be safe integers in ascending order with a range below 2^48.')
  }

  return cryptoRandomInt(minInclusive, maxExclusive)
}

function randomIndex(length) {
  if (!Number.isSafeInteger(length) || length < 1 || length >= 2 ** 48) {
    throw new RangeError('Random index length must be a positive safe integer below 2^48.')
  }

  return cryptoRandomInt(0, length)
}

function randomBoolean() {
  return randomIndex(2) === 1
}

function coinFlip() {
  return randomBoolean() ? 'Tails' : 'Heads'
}

function rollDie(numSides) {
  return randomInteger(1, numSides)
}

function randomUuid() {
  return cryptoRandomUUID()
}

function randomBytes(byteLength) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new RangeError('Random byte length must be a non-negative safe integer.')
  }

  return cryptoRandomBytes(byteLength)
}

module.exports = {
  coinFlip,
  randomBoolean,
  randomBytes,
  randomIndex,
  randomInteger,
  randomUuid,
  rollDie
}
