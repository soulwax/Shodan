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

import type { DivinationSpread } from '../data/divination-spreads'
import type { DivinationReading } from './divination-reading'
import { buildDivinationPromptMessages } from '../data/prompts/divination'

export function getReadingLimits(spread: DivinationSpread): {
  maxCharacters: number
  maxTokens: number
} {
  if (spread.positions.length === 1)
    return { maxCharacters: 800, maxTokens: 500 }
  if (spread.positions.length <= 5)
    return { maxCharacters: 1500, maxTokens: 850 }
  return { maxCharacters: 2200, maxTokens: 1200 }
}

export function buildDivinationMessages(reading: DivinationReading) {
  const { maxCharacters } = getReadingLimits(reading.spread)
  return buildDivinationPromptMessages({ ...reading, maxCharacters })
}
