// File: src/utils/random.ts


import crypto from 'crypto';

export function getRandom(min: number, max: number): number {
  // number between min and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getRandomSecure(min: number, max: number): number {
  // number between min and max (inclusive)
  return crypto.randomInt(min, max + 1);
}

export function rollDie(numSides: number): number {
  return Math.floor(Math.random() * numSides) + 1; // Adjusted for 1-based dice
}

export function rollDieSecure(numSides: number): number {
  return crypto.randomInt(1, numSides + 1); // Adjusted for 1-based dice
}

export function coinFlip(): 'Heads' | 'Tails' {
  const result = crypto.randomInt(0, 2);
  return result === 0 ? 'Heads' : 'Tails';
}