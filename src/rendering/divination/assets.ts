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

import { loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'
import type { Card } from '../../types/card'
import type { DrawnCard } from '../../services/divination-reading'
import { logger } from '../../utils/logger'
import type { CardImage } from './types'

export function cardImageFilename(card: Card): string {
  const suit =
    card.type === 'major'
      ? 'm'
      : card.suit === 'cups'
        ? 'c'
        : card.suit === 'wands'
          ? 'w'
          : card.suit === 'swords'
            ? 's'
            : 'p'

  if (card.type === 'major') {
    const aliases: Record<number, string> = { 8: 'strength', 10: 'wheel' }
    let name =
      aliases[card.value_int] ??
      card.name
        .toLowerCase()
        .replace(/^the\s+/i, '')
        .replace(/\s+last\s+/i, '')
        .replace(/\s+/g, '')
    if (name === 'hangedman') name = 'hanged'
    return `${suit}_${card.value_int.toString().padStart(2, '0')}_${name}.jpg`
  }

  if (['page', 'knight', 'queen', 'king'].includes(card.value || '')) {
    return `${suit}_${card.value}.jpg`
  }
  if (card.value?.toLowerCase() === 'ace') return `${suit}_ace.jpg`
  return `${suit}_${card.value_int}.jpg`
}

export async function loadCardImages(
  draws: DrawnCard[],
  imageDirectory: string
): Promise<Array<CardImage | null>> {
  return Promise.all(
    draws.map(async (draw) => {
      const filename = path.join(imageDirectory, cardImageFilename(draw.card))
      if (!fs.existsSync(filename)) return null
      try {
        return await loadImage(filename)
      } catch (error) {
        logger.warn(`[Divine] Could not load card image ${filename}:`, error)
        return null
      }
    })
  )
}
