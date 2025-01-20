// File: src/utils/utils.js

const crypto = require('crypto')

function getRandom(min, max) {
  // number between min anx max (inclusive)
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function getRandomSecure(min, max) {
  // number between min anx max (inclusive)
  return crypto.randomInt(min, max)
}

function rollDie(numSides) {
  return Math.floor(Math.random() * numSides) + 1 // Adjusted for 1-based dice
}

function rollDieSecure(numSides) {
  return crypto.randomInt(1, numSides) // Adjusted for 1-based dice
}

function coinFlip() {
  const result = crypto.randomInt(0, 2)
  return result === 0 ? 'Heads' : 'Tails'
}

module.exports = {
  coinFlip,
  rollDieSecure,
  getRandomSecure,
  rollDie,
  getRandom
}
