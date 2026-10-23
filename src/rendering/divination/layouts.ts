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

import { createCanvas } from 'canvas'
import type { DivinationSpread } from '../../data/divination-spreads'
import type { DrawnCard } from '../../services/divination-reading'
import type { CardImage, Point } from './types'
import {
  palette,
  drawBackground,
  drawHeader,
  drawFooter,
  drawPositionLabel,
  drawCard,
  drawConnector,
  drawLegend
} from './components'

function drawSingleCard(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 850
  const height = 1110
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)
  const cardWidth = 460
  const cardHeight = 750
  const centerX = width / 2
  const centerY = 617
  drawPositionLabel(context, draws[0], centerX, 207, cardWidth + 40)
  drawCard(
    context,
    draws[0],
    images[0],
    0,
    centerX,
    centerY,
    cardWidth,
    cardHeight
  )
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

function drawLinearSpread(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1470
  const height = 850
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)
  const cardWidth = 330
  const cardHeight = 538
  const centers = [270, width / 2, width - 270]
  draws.forEach((draw, index) => {
    drawPositionLabel(context, draw, centers[index], 207, cardWidth + 32)
    drawCard(
      context,
      draw,
      images[index],
      index,
      centers[index],
      492,
      cardWidth,
      cardHeight
    )
  })
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

function drawDecisionSpread(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1580
  const height = 1260
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)

  const sideX = 240
  const centerX = width / 2
  const rightX = width - sideX
  const cardWidth = 225
  const cardHeight = 367
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.muted
  context.font = '700 15px sans-serif'
  context.fillText('OPTION A', sideX, 190)
  context.fillText('DECISION LENS', centerX, 422)
  context.fillText('OPTION B', rightX, 190)
  drawConnector(context, [
    { x: sideX + cardWidth / 2 + 16, y: 680 },
    { x: centerX - cardWidth / 2 - 22, y: 680 }
  ])
  drawConnector(context, [
    { x: centerX + cardWidth / 2 + 22, y: 680 },
    { x: rightX - cardWidth / 2 - 16, y: 680 }
  ])

  const points = [
    { x: sideX, y: 430 },
    { x: sideX, y: 905 },
    { x: rightX, y: 430 },
    { x: rightX, y: 905 },
    { x: centerX, y: 680 }
  ]
  draws.forEach((draw, index) => {
    drawPositionLabel(
      context,
      draw,
      points[index].x,
      points[index].y - cardHeight / 2 - 19,
      cardWidth + 58
    )
    drawCard(
      context,
      draw,
      images[index],
      index,
      points[index].x,
      points[index].y,
      cardWidth,
      cardHeight
    )
  })
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

function drawRelationshipSpread(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1560
  const height = 1380
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)

  const cardWidth = 250
  const cardHeight = 408
  const points = [
    { x: 315, y: 735 },
    { x: width - 315, y: 735 },
    { x: width / 2, y: 425 },
    { x: width / 2, y: 1080 }
  ]
  drawConnector(context, [points[2], points[0]])
  drawConnector(context, [points[2], points[1]])
  drawConnector(context, [points[0], points[3]])
  drawConnector(context, [points[1], points[3]])

  draws.forEach((draw, index) => {
    drawPositionLabel(
      context,
      draw,
      points[index].x,
      points[index].y - cardHeight / 2 - 20,
      cardWidth + 170
    )
    drawCard(
      context,
      draw,
      images[index],
      index,
      points[index].x,
      points[index].y,
      cardWidth,
      cardHeight
    )
  })
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

function drawCelticCross(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1810
  const height = 1690
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)

  const mainWidth = 190
  const mainHeight = 310
  const crossCenter = { x: 505, y: 630 }
  const crossPoints: Record<string, Point> = {
    conscious_focus: { x: crossCenter.x, y: 300 },
    recent_past: { x: 245, y: crossCenter.y },
    present: crossCenter,
    challenge: { ...crossCenter, rotation: 90, scale: 0.72 },
    near_term: { x: 765, y: crossCenter.y },
    foundation: { x: crossCenter.x, y: 960 }
  }

  drawConnector(context, [
    { x: crossCenter.x, y: 300 + mainHeight / 2 + 12 },
    { x: crossCenter.x, y: 960 - mainHeight / 2 - 12 }
  ])
  drawConnector(context, [
    { x: 245 + mainWidth / 2 + 12, y: crossCenter.y },
    { x: 765 - mainWidth / 2 - 12, y: crossCenter.y }
  ])

  const staffX = 1435
  const staffWidth = 160
  const staffHeight = 261
  const staffY = [1200, 900, 600, 300]
  const staffHeader = context
  staffHeader.textAlign = 'center'
  staffHeader.textBaseline = 'alphabetic'
  staffHeader.fillStyle = palette.gold
  staffHeader.font = '700 16px sans-serif'
  staffHeader.fillText('THE STAFF', staffX, 205)
  drawConnector(
    context,
    staffY.map((y) => ({ x: staffX, y }))
  )

  draws.forEach((draw, index) => {
    const point = crossPoints[draw.position.id] ?? {
      x: staffX,
      y: staffY[index - 6] ?? staffY[staffY.length - 1]
    }
    const isStaff = index >= 6
    const cardWidth = isStaff ? staffWidth : mainWidth
    const cardHeight = isStaff ? staffHeight : mainHeight
    drawCard(
      context,
      draw,
      images[index],
      index,
      point.x,
      point.y,
      cardWidth,
      cardHeight,
      point
    )
  })

  drawLegend(context, draws, width, 1380)
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

function drawFallbackLayout(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const columns = Math.min(3, draws.length)
  const rows = Math.ceil(draws.length / columns)
  const cellWidth = 400
  const cardWidth = 260
  const cardHeight = 424
  const rowHeight = 505
  const width = columns * cellWidth + 100
  const height = 185 + rows * rowHeight + 70
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  drawBackground(context, width, height)
  drawHeader(context, spread, width)

  draws.forEach((draw, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const centerX = 50 + cellWidth * column + cellWidth / 2
    const centerY = 185 + row * rowHeight + 250
    drawPositionLabel(
      context,
      draw,
      centerX,
      centerY - cardHeight / 2 - 20,
      cardWidth + 100
    )
    drawCard(
      context,
      draw,
      images[index],
      index,
      centerX,
      centerY,
      cardWidth,
      cardHeight
    )
  })
  drawFooter(context, width, height)
  return canvas.toBuffer('image/png')
}

/** Layout coordinates and draw order stay deterministic for replayed readings. */
export function renderDivinationLayout(
  draws: DrawnCard[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  if (draws.length === 1) {
    return drawSingleCard(draws, images, spread)
  } else if (
    spread.id === 'three_card' ||
    spread.id === 'past_present_future'
  ) {
    return drawLinearSpread(draws, images, spread)
  } else if (spread.id === 'decision') {
    return drawDecisionSpread(draws, images, spread)
  } else if (spread.id === 'relationship') {
    return drawRelationshipSpread(draws, images, spread)
  } else if (spread.id === 'celtic_cross') {
    return drawCelticCross(draws, images, spread)
  } else {
    return drawFallbackLayout(draws, images, spread)
  }
}
