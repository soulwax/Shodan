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

import type { DivinationSpread } from '../../data/divination-spreads'
import type { DrawnCard } from '../../services/divination-reading'
import type { CardImage, DrawingContext, Point } from './types'

export const palette = {
  backgroundTop: '#07110d',
  backgroundBottom: '#0b1912',
  panel: '#101b15',
  panelHighlight: '#19271e',
  gold: '#83c99a',
  goldDim: '#426b50',
  parchment: '#f4ecda',
  text: '#f7f1e7',
  muted: '#b8c8bc',
  purple: '#a77cc0'
}

function roundedRect(
  context: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function setFittedFont(
  context: DrawingContext,
  text: string,
  width: number,
  preferredSize: number,
  minimumSize: number,
  weight = '600',
  family = 'sans-serif'
): void {
  let size = preferredSize
  context.font = `${weight} ${size}px ${family}`
  while (size > minimumSize && context.measureText(text).width > width) {
    size -= 1
    context.font = `${weight} ${size}px ${family}`
  }
}

export function drawBackground(
  context: DrawingContext,
  width: number,
  height: number
): void {
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, palette.backgroundTop)
  gradient.addColorStop(1, palette.backgroundBottom)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  drawWaveThreads(context, width, height)
  drawBlueprintGrid(context, width, height)
  drawFiligreeCorners(context, width, height)

  context.strokeStyle = 'rgba(131, 201, 154, 0.28)'
  context.lineWidth = 0.8
  clippedRect(context, 24, 24, width - 48, height - 48, 24)
  context.stroke()
}

/** Fine deterministic thread lines form a woven wave texture beneath the cards. */
function drawWaveThreads(
  context: DrawingContext,
  width: number,
  height: number
): void {
  context.save()
  context.strokeStyle = 'rgba(77, 157, 104, 0.038)'
  context.lineWidth = 0.48
  context.lineCap = 'round'

  const spacing = 7
  const step = 18
  for (let row = -1; row * spacing < height; row += 1) {
    const baseline = row * spacing
    const phase = row * 0.075
    for (const threadOffset of [-0.8, 0.8]) {
      context.beginPath()
      for (let x = 0; x <= width + step; x += step) {
        const progress = x / width
        const broadWave = Math.sin(progress * Math.PI * 3 + phase) * 2.8
        const fineWave = Math.sin(progress * Math.PI * 9 - phase * 0.72) * 0.65
        const y = baseline + broadWave + fineWave + threadOffset
        if (x === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
    }
  }

  for (let column = -1; column * spacing < width; column += 1) {
    const baseline = column * spacing
    const phase = column * 0.075
    for (const threadOffset of [-0.8, 0.8]) {
      context.beginPath()
      for (let y = 0; y <= height + step; y += step) {
        const progress = y / height
        const broadWave = Math.sin(progress * Math.PI * 3 + phase) * 2.8
        const fineWave = Math.sin(progress * Math.PI * 9 - phase * 0.72) * 0.65
        const x = baseline + broadWave + fineWave + threadOffset
        if (y === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
    }
  }

  context.restore()
}

/** Blueprint grid is measured in nominal 96-pixel inches. */
function drawBlueprintGrid(
  context: DrawingContext,
  width: number,
  height: number
): void {
  const inch = 96
  const offset = inch / 2
  context.save()
  context.strokeStyle = 'rgba(92, 190, 126, 0.17)'
  context.lineWidth = 0.7
  context.beginPath()
  for (let x = offset; x < width; x += inch) {
    context.moveTo(x, 24)
    context.lineTo(x, height - 24)
  }
  for (let y = offset; y < height; y += inch) {
    context.moveTo(24, y)
    context.lineTo(width - 24, y)
  }
  context.stroke()
  context.restore()
}

function clippedRect(
  context: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number
): void {
  context.beginPath()
  context.moveTo(x + cut, y)
  context.lineTo(x + width - cut, y)
  context.lineTo(x + width, y + cut)
  context.lineTo(x + width, y + height - cut)
  context.lineTo(x + width - cut, y + height)
  context.lineTo(x + cut, y + height)
  context.lineTo(x, y + height - cut)
  context.lineTo(x, y + cut)
  context.closePath()
}

function drawFiligreeCorners(
  context: DrawingContext,
  width: number,
  height: number
): void {
  const inset = 46
  const size = 18
  const corners = [
    { x: inset, y: inset, sx: 1, sy: 1 },
    { x: width - inset, y: inset, sx: -1, sy: 1 },
    { x: width - inset, y: height - inset, sx: -1, sy: -1 },
    { x: inset, y: height - inset, sx: 1, sy: -1 }
  ]
  context.save()
  context.strokeStyle = 'rgba(131, 201, 154, 0.34)'
  context.lineWidth = 0.7
  for (const corner of corners) {
    context.save()
    context.translate(corner.x, corner.y)
    context.scale(corner.sx, corner.sy)
    context.beginPath()
    context.moveTo(0, size * 2)
    context.quadraticCurveTo(0, 0, size * 2, 0)
    context.moveTo(0, size)
    context.quadraticCurveTo(0, 0, size, 0)
    context.moveTo(size * 2, 0)
    context.lineTo(size * 2 + 9, 0)
    context.moveTo(0, size * 2)
    context.lineTo(0, size * 2 + 9)
    context.stroke()
    context.beginPath()
    context.moveTo(size, -4)
    context.lineTo(size + 4, 0)
    context.lineTo(size, 4)
    context.lineTo(size - 4, 0)
    context.closePath()
    context.stroke()
    context.restore()
  }
  context.restore()
}

export function drawHeader(
  context: DrawingContext,
  spread: DivinationSpread,
  width: number
): void {
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.gold
  context.font = '600 15px serif'
  context.fillText('S H O D A N   ·   T A R O T', width / 2, 59)

  context.fillStyle = palette.text
  setFittedFont(context, spread.name, width - 110, 40, 25, '700', 'serif')
  context.fillText(spread.name, width / 2, 106, width - 110)

  context.fillStyle = palette.muted
  setFittedFont(
    context,
    spread.description,
    width - 150,
    16,
    12,
    '400',
    'serif'
  )
  context.fillText(spread.description, width / 2, 137, width - 150)

  const y = 159
  context.strokeStyle = 'rgba(131, 201, 154, 0.34)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(72, y)
  context.lineTo(width / 2 - 20, y)
  context.moveTo(width / 2 + 20, y)
  context.lineTo(width - 72, y)
  context.stroke()
  context.save()
  context.translate(width / 2, y)
  context.rotate(Math.PI / 4)
  context.fillStyle = palette.gold
  context.fillRect(-4, -4, 8, 8)
  context.restore()
}

export function drawFooter(
  context: DrawingContext,
  width: number,
  height: number
): void {
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.muted
  context.font = '500 12px serif'
  context.fillText(
    'RIDER–WAITE SET  ·  SHODAN: WHY SAY GOODBYE?  ·  GNU v3.0  ·',
    width / 2,
    height - 34
  )
}

export function drawPositionLabel(
  context: DrawingContext,
  draw: DrawnCard,
  centerX: number,
  baselineY: number,
  width: number
): void {
  const label = `${draw.position.name.toLocaleUpperCase()}${draw.reversed ? '  ·  REVERSED' : ''}`
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.gold
  setFittedFont(context, label, width, 18, 12, '700', 'serif')
  context.fillText(label, centerX, baselineY, width)
}

function drawBadge(
  context: DrawingContext,
  number: number,
  x: number,
  y: number
): void {
  context.save()
  context.fillStyle = palette.panel
  context.strokeStyle = palette.gold
  context.lineWidth = 1
  context.beginPath()
  context.arc(x, y, 14, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = palette.parchment
  context.font = '700 11px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(number).padStart(2, '0'), x, y + 1)
  context.restore()
}

export function drawCard(
  context: DrawingContext,
  draw: DrawnCard,
  image: CardImage | null,
  index: number,
  centerX: number,
  centerY: number,
  cardWidth: number,
  cardHeight: number,
  point: Point = { x: centerX, y: centerY }
): void {
  const scale = point.scale ?? 1
  const width = cardWidth * scale
  const height = cardHeight * scale
  const rotation = ((point.rotation ?? 0) * Math.PI) / 180

  context.save()
  context.translate(centerX, centerY)
  context.rotate(rotation)
  context.shadowColor = 'rgba(0, 0, 0, 0.6)'
  context.shadowBlur = 16
  context.shadowOffsetY = 7
  roundedRect(context, -width / 2, -height / 2, width, height, 9 * scale)
  context.fillStyle = palette.parchment
  context.fill()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetY = 0
  context.strokeStyle = 'rgba(17, 12, 20, 0.72)'
  context.lineWidth = 3 * scale
  context.stroke()
  context.strokeStyle = palette.gold
  context.lineWidth = 0.9 * scale
  roundedRect(
    context,
    -width / 2 + 3 * scale,
    -height / 2 + 3 * scale,
    width - 6 * scale,
    height - 6 * scale,
    7 * scale
  )
  context.stroke()

  const inset = 11 * scale
  const innerWidth = width - inset * 2
  const innerHeight = height - inset * 2
  if (image) {
    const fit = Math.min(innerWidth / image.width, innerHeight / image.height)
    const imageWidth = image.width * fit
    const imageHeight = image.height * fit
    context.save()
    roundedRect(
      context,
      -innerWidth / 2,
      -innerHeight / 2,
      innerWidth,
      innerHeight,
      5 * scale
    )
    context.clip()
    if (draw.reversed) context.rotate(Math.PI)
    context.drawImage(
      image,
      -imageWidth / 2,
      -imageHeight / 2,
      imageWidth,
      imageHeight
    )
    context.restore()
  } else {
    context.fillStyle = '#e7dcc2'
    roundedRect(
      context,
      -innerWidth / 2,
      -innerHeight / 2,
      innerWidth,
      innerHeight,
      8 * scale
    )
    context.fill()
    context.strokeStyle = palette.goldDim
    context.lineWidth = 1 * scale
    context.stroke()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#463750'
    setFittedFont(
      context,
      draw.card.name,
      innerWidth - 26 * scale,
      24 * scale,
      16 * scale,
      '700',
      'serif'
    )
    context.fillText(draw.card.name, 0, 0, innerWidth - 26 * scale)
  }
  context.restore()

  const rotated = Math.abs((point.rotation ?? 0) % 180) === 90
  const boundsWidth = rotated ? height : width
  const boundsHeight = rotated ? width : height
  drawBadge(
    context,
    index + 1,
    centerX - boundsWidth / 2 + 21,
    centerY - boundsHeight / 2 + 21
  )
}

export function drawConnector(
  context: DrawingContext,
  points: Array<{ x: number; y: number }>
): void {
  if (points.length < 2) return
  context.save()
  context.strokeStyle = 'rgba(131, 201, 154, 0.22)'
  context.lineWidth = 0.9
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
  context.stroke()
  context.restore()
}

export function drawLegend(
  context: DrawingContext,
  draws: DrawnCard[],
  width: number,
  top: number
): void {
  const padding = 62
  const gap = 40
  const columnWidth = (width - padding * 2 - gap) / 2
  const rowHeight = 32
  const rowsPerColumn = Math.ceil(draws.length / 2)
  const boxHeight = rowsPerColumn * rowHeight + 54

  context.strokeStyle = 'rgba(131, 201, 154, 0.24)'
  context.lineWidth = 0.8
  context.beginPath()
  context.moveTo(padding, top + 2)
  context.lineTo(width - padding, top + 2)
  context.moveTo(padding, top + boxHeight - 2)
  context.lineTo(width - padding, top + boxHeight - 2)
  context.stroke()

  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.gold
  context.font = '600 12px serif'
  context.fillText('READING KEY', width / 2, top + 22)

  draws.forEach((draw, index) => {
    const column = index < rowsPerColumn ? 0 : 1
    const row = column === 0 ? index : index - rowsPerColumn
    const x = padding + 24 + column * (columnWidth + gap)
    const y = top + 47 + row * rowHeight
    const label = `${String(index + 1).padStart(2, '0')}  ${draw.position.name}  ·  ${draw.card.name}${draw.reversed ? ' (reversed)' : ''}`
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillStyle = palette.parchment
    setFittedFont(context, label, columnWidth - 38, 16, 12, '500', 'serif')
    context.fillText(label, x, y, columnWidth - 38)
  })
}
