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

export const DEFAULT_DIVINE_MEANNESS = 2

export const MEANNESS_LABELS: Readonly<Record<number, string>> = {
  1: 'Gentle',
  2: 'Dry (default)',
  3: 'Sharp',
  4: 'Spicy',
  5: 'Maximum playful bite'
}

export const MEANNESS_LEVELS = Object.keys(MEANNESS_LABELS).map(Number)
export const MIN_MEANNESS_LEVEL = Math.min(...MEANNESS_LEVELS)
export const MAX_MEANNESS_LEVEL = Math.max(...MEANNESS_LEVELS)
export const MEANNESS_CHOICES = Object.entries(MEANNESS_LABELS).map(
  ([value, name]) => ({
    name,
    value: Number(value)
  })
)

export function meannessInstruction(level: number): string {
  const instructions: Record<number, string> = {
    1: 'Keep the teasing very gentle and affectionate, with only the lightest dry humor.',
    2: 'Use dry, friendly humor with a little teasing, while clearly staying on the person’s side.',
    3: 'Make the wit sharper and the teasing more noticeable, but keep it playful and useful.',
    4: 'Use spicy, pointed banter and a stronger comic bite, while remaining supportive rather than cruel.',
    5: 'Deliver a scathing, theatrical roast of the situation and choices explicitly described in the question. Keep it absurdly comedic; do not invent personal details or attack vulnerabilities. End with a slight wink of encouragement.'
  }
  return instructions[level] ?? instructions[DEFAULT_DIVINE_MEANNESS]
}
