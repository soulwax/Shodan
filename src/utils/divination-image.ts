import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { DivinationSpread } from '../data/divination-spreads';
import { Card } from '../types/card';
import { logger } from './logger';

interface ImageDraw {
  card: Card;
  reversed: boolean;
  position: DivinationSpread['positions'][number];
}

interface Point {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
}

type CardImage = Awaited<ReturnType<typeof loadImage>>;

const palette = {
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
};

function cardImageFilename(card: Card): string {
  const suit = card.type === 'major'
    ? 'm'
    : card.suit === 'cups'
      ? 'c'
      : card.suit === 'wands'
        ? 'w'
        : card.suit === 'swords'
          ? 's'
          : 'p';

  if (card.type === 'major') {
    const aliases: Record<number, string> = { 8: 'strength', 10: 'wheel' };
    let name = aliases[card.value_int] ?? card.name
      .toLowerCase()
      .replace(/^the\s+/i, '')
      .replace(/\s+last\s+/i, '')
      .replace(/\s+/g, '');
    if (name === 'hangedman') name = 'hanged';
    return `${suit}_${card.value_int.toString().padStart(2, '0')}_${name}.jpg`;
  }

  if (['page', 'knight', 'queen', 'king'].includes(card.value || '')) {
    return `${suit}_${card.value}.jpg`;
  }
  if (card.value?.toLowerCase() === 'ace') return `${suit}_ace.jpg`;
  return `${suit}_${card.value_int}.jpg`;
}

function roundedRect(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function setFittedFont(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  text: string,
  width: number,
  preferredSize: number,
  minimumSize: number,
  weight = '600'
): void {
  let size = preferredSize;
  context.font = `${weight} ${size}px sans-serif`;
  while (size > minimumSize && context.measureText(text).width > width) {
    size -= 1;
    context.font = `${weight} ${size}px sans-serif`;
  }
}

function drawBackground(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  width: number,
  height: number
): void {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.backgroundTop);
  gradient.addColorStop(1, palette.backgroundBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.1;
  context.strokeStyle = palette.gold;
  context.lineWidth = 1;
  for (let index = 0; index < 7; index += 1) {
    context.beginPath();
    context.arc(width - 24, 24, 95 + index * 28, Math.PI * 0.58, Math.PI * 1.42);
    context.stroke();
  }
  context.restore();

  context.strokeStyle = 'rgba(214, 186, 130, 0.28)';
  context.lineWidth = 1;
  roundedRect(context, 22, 22, width - 44, height - 44, 22);
  context.stroke();
}

function drawHeader(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  spread: DivinationSpread,
  width: number
): void {
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = palette.gold;
  context.font = '600 15px sans-serif';
  context.fillText('S H O D A N   ·   T A R O T', width / 2, 59);

  context.fillStyle = palette.text;
  setFittedFont(context, spread.name, width - 110, 38, 25, '700');
  context.fillText(spread.name, width / 2, 106, width - 110);

  context.fillStyle = palette.muted;
  setFittedFont(context, spread.description, width - 150, 17, 13, '400');
  context.fillText(spread.description, width / 2, 137, width - 150);

  const y = 159;
  context.strokeStyle = palette.goldDim;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(72, y);
  context.lineTo(width / 2 - 20, y);
  context.moveTo(width / 2 + 20, y);
  context.lineTo(width - 72, y);
  context.stroke();
  context.save();
  context.translate(width / 2, y);
  context.rotate(Math.PI / 4);
  context.fillStyle = palette.gold;
  context.fillRect(-5, -5, 10, 10);
  context.restore();
}

function drawFooter(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  width: number,
  height: number
): void {
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = palette.muted;
  context.font = '500 13px sans-serif';
  context.fillText('RIDER–WAITE SMITH  ·  A PROMPT FOR REFLECTION', width / 2, height - 34);
}

function drawPositionLabel(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  draw: ImageDraw,
  centerX: number,
  baselineY: number,
  width: number
): void {
  const label = `${draw.position.name.toLocaleUpperCase()}${draw.reversed ? '  ·  REVERSED' : ''}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = palette.gold;
  setFittedFont(context, label, width, 18, 12, '700');
  context.fillText(label, centerX, baselineY, width);
}

function drawBadge(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  number: number,
  x: number,
  y: number
): void {
  context.save();
  context.fillStyle = palette.panel;
  context.strokeStyle = palette.gold;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 18, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = palette.parchment;
  context.font = '700 13px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(number).padStart(2, '0'), x, y + 1);
  context.restore();
}

function drawCard(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  draw: ImageDraw,
  image: CardImage | null,
  index: number,
  centerX: number,
  centerY: number,
  cardWidth: number,
  cardHeight: number,
  point: Point = { x: centerX, y: centerY }
): void {
  const scale = point.scale ?? 1;
  const width = cardWidth * scale;
  const height = cardHeight * scale;
  const rotation = (point.rotation ?? 0) * Math.PI / 180;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowBlur = 20;
  context.shadowOffsetY = 10;
  roundedRect(context, -width / 2, -height / 2, width, height, 14 * scale);
  context.fillStyle = palette.parchment;
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.strokeStyle = palette.gold;
  context.lineWidth = 2 * scale;
  context.stroke();

  const inset = 9 * scale;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  if (image) {
    const fit = Math.min(innerWidth / image.width, innerHeight / image.height);
    const imageWidth = image.width * fit;
    const imageHeight = image.height * fit;
    context.save();
    if (draw.reversed) context.rotate(Math.PI);
    context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    context.restore();
  } else {
    context.fillStyle = '#e7dcc2';
    roundedRect(context, -innerWidth / 2, -innerHeight / 2, innerWidth, innerHeight, 8 * scale);
    context.fill();
    context.strokeStyle = palette.goldDim;
    context.lineWidth = 1 * scale;
    context.stroke();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#463750';
    setFittedFont(context, draw.card.name, innerWidth - 26 * scale, 24 * scale, 16 * scale, '700');
    context.fillText(draw.card.name, 0, 0, innerWidth - 26 * scale);
  }
  context.restore();

  const rotated = Math.abs((point.rotation ?? 0) % 180) === 90;
  const boundsWidth = rotated ? height : width;
  const boundsHeight = rotated ? width : height;
  drawBadge(context, index + 1, centerX - boundsWidth / 2 + 19, centerY - boundsHeight / 2 + 19);
}

function drawConnector(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  points: Array<{ x: number; y: number }>
): void {
  if (points.length < 2) return;
  context.save();
  context.strokeStyle = 'rgba(214, 186, 130, 0.48)';
  context.lineWidth = 2;
  context.setLineDash([7, 9]);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => context.lineTo(point.x, point.y));
  context.stroke();
  context.restore();
}

function drawSingleCard(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 850;
  const height = 1110;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);
  const cardWidth = 460;
  const cardHeight = 750;
  const centerX = width / 2;
  const centerY = 617;
  drawPositionLabel(context, draws[0], centerX, 207, cardWidth + 40);
  drawCard(context, draws[0], images[0], 0, centerX, centerY, cardWidth, cardHeight);
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

function drawLinearSpread(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1470;
  const height = 850;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);
  const cardWidth = 330;
  const cardHeight = 538;
  const centers = [270, width / 2, width - 270];
  draws.forEach((draw, index) => {
    drawPositionLabel(context, draw, centers[index], 207, cardWidth + 32);
    drawCard(context, draw, images[index], index, centers[index], 492, cardWidth, cardHeight);
  });
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

function drawDecisionSpread(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1580;
  const height = 1260;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);

  const sideX = 240;
  const centerX = width / 2;
  const rightX = width - sideX;
  const cardWidth = 225;
  const cardHeight = 367;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = palette.muted;
  context.font = '700 15px sans-serif';
  context.fillText('OPTION A', sideX, 190);
  context.fillText('DECISION LENS', centerX, 422);
  context.fillText('OPTION B', rightX, 190);
  drawConnector(context, [
    { x: sideX + cardWidth / 2 + 16, y: 680 },
    { x: centerX - cardWidth / 2 - 22, y: 680 }
  ]);
  drawConnector(context, [
    { x: centerX + cardWidth / 2 + 22, y: 680 },
    { x: rightX - cardWidth / 2 - 16, y: 680 }
  ]);

  const points = [
    { x: sideX, y: 430 },
    { x: sideX, y: 905 },
    { x: rightX, y: 430 },
    { x: rightX, y: 905 },
    { x: centerX, y: 680 }
  ];
  draws.forEach((draw, index) => {
    drawPositionLabel(context, draw, points[index].x, points[index].y - cardHeight / 2 - 19, cardWidth + 58);
    drawCard(context, draw, images[index], index, points[index].x, points[index].y, cardWidth, cardHeight);
  });
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

function drawRelationshipSpread(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1560;
  const height = 1380;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);

  const cardWidth = 250;
  const cardHeight = 408;
  const points = [
    { x: 315, y: 735 },
    { x: width - 315, y: 735 },
    { x: width / 2, y: 425 },
    { x: width / 2, y: 1080 }
  ];
  drawConnector(context, [points[2], points[0]]);
  drawConnector(context, [points[2], points[1]]);
  drawConnector(context, [points[0], points[3]]);
  drawConnector(context, [points[1], points[3]]);

  draws.forEach((draw, index) => {
    drawPositionLabel(context, draw, points[index].x, points[index].y - cardHeight / 2 - 20, cardWidth + 170);
    drawCard(context, draw, images[index], index, points[index].x, points[index].y, cardWidth, cardHeight);
  });
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

function drawLegend(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  draws: ImageDraw[],
  width: number,
  top: number
): void {
  const padding = 62;
  const gap = 40;
  const columnWidth = (width - padding * 2 - gap) / 2;
  const rowHeight = 39;
  const rowsPerColumn = Math.ceil(draws.length / 2);
  const boxHeight = rowsPerColumn * rowHeight + 52;

  roundedRect(context, padding, top, width - padding * 2, boxHeight, 18);
  context.fillStyle = 'rgba(33, 24, 43, 0.92)';
  context.fill();
  context.strokeStyle = 'rgba(214, 186, 130, 0.55)';
  context.lineWidth = 1;
  context.stroke();

  draws.forEach((draw, index) => {
    const column = index < rowsPerColumn ? 0 : 1;
    const row = column === 0 ? index : index - rowsPerColumn;
    const x = padding + 24 + column * (columnWidth + gap);
    const y = top + 39 + row * rowHeight;
    const label = `${String(index + 1).padStart(2, '0')}  ${draw.position.name}  ·  ${draw.card.name}${draw.reversed ? ' (reversed)' : ''}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = palette.parchment;
    setFittedFont(context, label, columnWidth - 38, 16, 12, '500');
    context.fillText(label, x, y, columnWidth - 38);
  });
}

function drawCelticCross(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const width = 1810;
  const height = 1690;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);

  const mainWidth = 190;
  const mainHeight = 310;
  const crossCenter = { x: 505, y: 630 };
  const crossPoints: Record<string, Point> = {
    conscious_focus: { x: crossCenter.x, y: 300 },
    recent_past: { x: 245, y: crossCenter.y },
    present: crossCenter,
    challenge: { ...crossCenter, rotation: 90, scale: 0.72 },
    near_term: { x: 765, y: crossCenter.y },
    foundation: { x: crossCenter.x, y: 960 }
  };

  drawConnector(context, [
    { x: crossCenter.x, y: 300 + mainHeight / 2 + 12 },
    { x: crossCenter.x, y: 960 - mainHeight / 2 - 12 }
  ]);
  drawConnector(context, [
    { x: 245 + mainWidth / 2 + 12, y: crossCenter.y },
    { x: 765 - mainWidth / 2 - 12, y: crossCenter.y }
  ]);

  const staffX = 1435;
  const staffWidth = 160;
  const staffHeight = 261;
  const staffY = [1200, 900, 600, 300];
  const staffHeader = context;
  staffHeader.textAlign = 'center';
  staffHeader.textBaseline = 'alphabetic';
  staffHeader.fillStyle = palette.gold;
  staffHeader.font = '700 16px sans-serif';
  staffHeader.fillText('THE STAFF', staffX, 205);
  drawConnector(context, staffY.map(y => ({ x: staffX, y })));

  draws.forEach((draw, index) => {
    const point = crossPoints[draw.position.id] ?? {
      x: staffX,
      y: staffY[index - 6] ?? staffY[staffY.length - 1]
    };
    const isStaff = index >= 6;
    const cardWidth = isStaff ? staffWidth : mainWidth;
    const cardHeight = isStaff ? staffHeight : mainHeight;
    drawCard(context, draw, images[index], index, point.x, point.y, cardWidth, cardHeight, point);
  });

  drawLegend(context, draws, width, 1380);
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

function drawFallbackLayout(
  draws: ImageDraw[],
  images: Array<CardImage | null>,
  spread: DivinationSpread
): Buffer {
  const columns = Math.min(3, draws.length);
  const rows = Math.ceil(draws.length / columns);
  const cellWidth = 400;
  const cardWidth = 260;
  const cardHeight = 424;
  const rowHeight = 505;
  const width = columns * cellWidth + 100;
  const height = 185 + rows * rowHeight + 70;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  drawBackground(context, width, height);
  drawHeader(context, spread, width);

  draws.forEach((draw, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centerX = 50 + cellWidth * column + cellWidth / 2;
    const centerY = 185 + row * rowHeight + 250;
    drawPositionLabel(context, draw, centerX, centerY - cardHeight / 2 - 20, cardWidth + 100);
    drawCard(context, draw, images[index], index, centerX, centerY, cardWidth, cardHeight);
  });
  drawFooter(context, width, height);
  return canvas.toBuffer('image/png');
}

export async function createDivinationSpreadImage(
  draws: ImageDraw[],
  spread: DivinationSpread,
  imageDirectory: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  if (!draws.length) return null;

  const images = await Promise.all(draws.map(async draw => {
    const filename = path.join(imageDirectory, cardImageFilename(draw.card));
    if (!fs.existsSync(filename)) return null;
    try {
      return await loadImage(filename);
    } catch (error) {
      logger.warn(`[Divine] Could not load card image ${filename}:`, error);
      return null;
    }
  }));

  let buffer: Buffer;
  if (draws.length === 1) {
    buffer = drawSingleCard(draws, images, spread);
  } else if (spread.id === 'three_card' || spread.id === 'past_present_future') {
    buffer = drawLinearSpread(draws, images, spread);
  } else if (spread.id === 'decision') {
    buffer = drawDecisionSpread(draws, images, spread);
  } else if (spread.id === 'relationship') {
    buffer = drawRelationshipSpread(draws, images, spread);
  } else if (spread.id === 'celtic_cross') {
    buffer = drawCelticCross(draws, images, spread);
  } else {
    buffer = drawFallbackLayout(draws, images, spread);
  }

  return { buffer, filename: 'divination-spread.png' };
}
