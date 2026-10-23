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
  backgroundTop: '#130d1d',
  backgroundBottom: '#251830',
  panel: '#21182b',
  panelHighlight: '#30213a',
  gold: '#d6ba82',
  goldDim: '#806c4f',
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
  weight = '600'
): void {
  let size = preferredSize
  context.font = `${weight} ${size}px sans-serif`
  while (size > minimumSize && context.measureText(text).width > width) {
    size -= 1
    context.font = `${weight} ${size}px sans-serif`
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

  context.save()
  context.globalAlpha = 0.1
  context.strokeStyle = palette.gold
  context.lineWidth = 1
  for (let index = 0; index < 7; index += 1) {
    context.beginPath()
    context.arc(width - 24, 24, 95 + index * 28, Math.PI * 0.58, Math.PI * 1.42)
    context.stroke()
  }
  context.restore()

  context.strokeStyle = 'rgba(214, 186, 130, 0.28)'
  context.lineWidth = 1
  roundedRect(context, 22, 22, width - 44, height - 44, 22)
  context.stroke()
}

export function drawHeader(
  context: DrawingContext,
  spread: DivinationSpread,
  width: number
): void {
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.gold
  context.font = '600 15px sans-serif'
  context.fillText('S H O D A N   ·   T A R O T', width / 2, 59)

  context.fillStyle = palette.text
  setFittedFont(context, spread.name, width - 110, 38, 25, '700')
  context.fillText(spread.name, width / 2, 106, width - 110)

  context.fillStyle = palette.muted
  setFittedFont(context, spread.description, width - 150, 17, 13, '400')
  context.fillText(spread.description, width / 2, 137, width - 150)

  const y = 159
  context.strokeStyle = palette.goldDim
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
  context.fillRect(-5, -5, 10, 10)
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
  context.font = '500 13px sans-serif'
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
  setFittedFont(context, label, width, 18, 12, '700')
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
  context.shadowColor = 'rgba(0, 0, 0, 0.55)'
  context.shadowBlur = 20
  context.shadowOffsetY = 10
  roundedRect(context, -width / 2, -height / 2, width, height, 14 * scale)
  context.fillStyle = palette.parchment
  context.fill()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetY = 0
  context.strokeStyle = palette.gold
  context.lineWidth = 2 * scale
  context.stroke()

  const inset = 9 * scale
  const innerWidth = width - inset * 2
  const innerHeight = height - inset * 2
  if (image) {
    const fit = Math.min(innerWidth / image.width, innerHeight / image.height)
    const imageWidth = image.width * fit
    const imageHeight = image.height * fit
    context.save()
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
      '700'
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
    centerX - boundsWidth / 2 + 19,
    centerY - boundsHeight / 2 + 19
  )
}

export function drawConnector(
  context: DrawingContext,
  points: Array<{ x: number; y: number }>
): void {
  if (points.length < 2) return
  context.save()
  context.strokeStyle = 'rgba(214, 186, 130, 0.48)'
  context.lineWidth = 2
  context.setLineDash([7, 9])
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
  const rowHeight = 39
  const rowsPerColumn = Math.ceil(draws.length / 2)
  const boxHeight = rowsPerColumn * rowHeight + 52

  roundedRect(context, padding, top, width - padding * 2, boxHeight, 18)
  context.fillStyle = 'rgba(33, 24, 43, 0.92)'
  context.fill()
  context.strokeStyle = 'rgba(214, 186, 130, 0.55)'
  context.lineWidth = 1
  context.stroke()

  draws.forEach((draw, index) => {
    const column = index < rowsPerColumn ? 0 : 1
    const row = column === 0 ? index : index - rowsPerColumn
    const x = padding + 24 + column * (columnWidth + gap)
    const y = top + 39 + row * rowHeight
    const label = `${String(index + 1).padStart(2, '0')}  ${draw.position.name}  ·  ${draw.card.name}${draw.reversed ? ' (reversed)' : ''}`
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillStyle = palette.parchment
    setFittedFont(context, label, columnWidth - 38, 16, 12, '500')
    context.fillText(label, x, y, columnWidth - 38)
  })
}
