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
  backgroundTop: '#100d18',
  backgroundBottom: '#24182c',
  panel: '#21182b',
  panelHighlight: '#30213a',
  gold: '#ddc38e',
  goldDim: '#89734f',
  parchment: '#f4ecda',
  text: '#f7f1e7',
  muted: '#c7b9cb',
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

  const glow = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    0,
    width * 0.5,
    height * 0.48,
    Math.max(width, height) * 0.65
  )
  glow.addColorStop(0, 'rgba(154, 112, 156, 0.12)')
  glow.addColorStop(1, 'rgba(9, 7, 14, 0.48)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  drawCelestialEngraving(context, width, height)

  // A seeded star field gives the paper a little texture without changing
  // between renders of the same canvas size.
  context.save()
  let state = (Math.imul(width, 73856093) ^ Math.imul(height, 19349663)) >>> 0
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  context.strokeStyle = palette.gold
  for (let index = 0; index < 180; index += 1) {
    const x = 38 + random() * (width - 76)
    const y = 38 + random() * (height - 76)
    const radius = random() > 0.94 ? 2.2 : 0.8
    context.globalAlpha = 0.06 + random() * 0.1
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fillStyle = palette.gold
    context.fill()
    if (radius > 2) {
      context.globalAlpha *= 0.65
      context.lineWidth = 0.7
      context.beginPath()
      context.moveTo(x - 5, y)
      context.lineTo(x + 5, y)
      context.moveTo(x, y - 5)
      context.lineTo(x, y + 5)
      context.stroke()
    }
  }
  context.restore()

  context.strokeStyle = 'rgba(221, 195, 142, 0.38)'
  context.lineWidth = 1
  clippedRect(context, 22, 22, width - 44, height - 44, 26)
  context.stroke()
  context.strokeStyle = 'rgba(221, 195, 142, 0.12)'
  clippedRect(context, 30, 30, width - 60, height - 60, 22)
  context.stroke()
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

function drawCelestialEngraving(
  context: DrawingContext,
  width: number,
  height: number
): void {
  context.save()
  context.translate(width / 2, height / 2)
  const radius = Math.min(width, height) * 0.31
  context.strokeStyle = 'rgba(221, 195, 142, 0.055)'
  context.lineWidth = 1
  for (const inset of [0, 13, 29]) {
    context.beginPath()
    context.arc(0, 0, radius + inset, 0, Math.PI * 2)
    context.stroke()
  }
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2
    const inner = radius + 4
    const outer = radius + (index % 3 === 0 ? 25 : 15)
    context.beginPath()
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    context.stroke()
  }
  context.restore()

  const inset = 46
  const size = 18
  const corners = [
    { x: inset, y: inset, sx: 1, sy: 1 },
    { x: width - inset, y: inset, sx: -1, sy: 1 },
    { x: width - inset, y: height - inset, sx: -1, sy: -1 },
    { x: inset, y: height - inset, sx: 1, sy: -1 }
  ]
  context.save()
  context.strokeStyle = 'rgba(221, 195, 142, 0.48)'
  context.lineWidth = 1
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
  setFittedFont(context, spread.description, width - 150, 16, 12, '400', 'serif')
  context.fillText(spread.description, width / 2, 137, width - 150)

  const y = 159
  context.strokeStyle = 'rgba(221, 195, 142, 0.44)'
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
    'RIDER–WAITE SMITH  ·  A PROMPT FOR REFLECTION',
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
  context.lineWidth = 2
  context.beginPath()
  context.arc(x, y, 18, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = palette.parchment
  context.font = '700 13px sans-serif'
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
  context.shadowBlur = 24
  context.shadowOffsetY = 12
  roundedRect(context, -width / 2, -height / 2, width, height, 14 * scale)
  const mat = context.createLinearGradient(-width / 2, 0, width / 2, height)
  mat.addColorStop(0, '#f7f0e1')
  mat.addColorStop(0.52, palette.parchment)
  mat.addColorStop(1, '#e4d7bd')
  context.fillStyle = mat
  context.fill()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetY = 0
  context.strokeStyle = 'rgba(17, 12, 20, 0.8)'
  context.lineWidth = 5 * scale
  context.stroke()
  context.strokeStyle = palette.gold
  context.lineWidth = 1.5 * scale
  roundedRect(
    context,
    -width / 2 + 3 * scale,
    -height / 2 + 3 * scale,
    width - 6 * scale,
    height - 6 * scale,
    11 * scale
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
  context.strokeStyle = 'rgba(221, 195, 142, 0.08)'
  context.lineWidth = 5
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
  context.stroke()
  context.strokeStyle = 'rgba(221, 195, 142, 0.32)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
  context.stroke()
  for (const point of [points[0], points[points.length - 1]]) {
    context.fillStyle = 'rgba(221, 195, 142, 0.64)'
    context.beginPath()
    context.arc(point.x, point.y, 2.4, 0, Math.PI * 2)
    context.fill()
  }
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

  roundedRect(context, padding, top, width - padding * 2, boxHeight, 18)
  context.fillStyle = 'rgba(24, 17, 30, 0.86)'
  context.fill()
  context.strokeStyle = 'rgba(221, 195, 142, 0.48)'
  context.lineWidth = 1
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
