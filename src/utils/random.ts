// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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