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

// File: src/data/colors.ts

export interface ColorDefinition {
  id: string;
  name: string;
  hex: string;
  colorNumber: number;
  emoji: string;
  category: 'warm' | 'cool';
}

export const COLOR_ROLE_MARKER = '✦';

export const COLOR_ROLE_PREFIXES = [
  '✦',
  '✧',
  '🎨',
  'color-',
  'colour-',
  'color:',
  'colour:'
];

export const COLOR_PALETTE: ColorDefinition[] = [
  // Warm & Vibrant Hues
  { id: 'crimson', name: 'Crimson', hex: '#E74C3C', colorNumber: 0xE74C3C, emoji: '🟥', category: 'warm' },
  { id: 'scarlet', name: 'Scarlet', hex: '#FF2442', colorNumber: 0xFF2442, emoji: '🔴', category: 'warm' },
  { id: 'ruby', name: 'Ruby', hex: '#C0392B', colorNumber: 0xC0392B, emoji: '♦️', category: 'warm' },
  { id: 'coral', name: 'Coral', hex: '#E67E22', colorNumber: 0xE67E22, emoji: '🟧', category: 'warm' },
  { id: 'tangerine', name: 'Tangerine', hex: '#FF793F', colorNumber: 0xFF793F, emoji: '🍊', category: 'warm' },
  { id: 'peach', name: 'Peach', hex: '#FFA07A', colorNumber: 0xFFA07A, emoji: '🍑', category: 'warm' },
  { id: 'amber', name: 'Amber', hex: '#F39C12', colorNumber: 0xF39C12, emoji: '🎃', category: 'warm' },
  { id: 'gold', name: 'Gold', hex: '#F1C40F', colorNumber: 0xF1C40F, emoji: '🟨', category: 'warm' },
  { id: 'lemon', name: 'Lemon', hex: '#FFF200', colorNumber: 0xFFF200, emoji: '🍋', category: 'warm' },
  { id: 'apricot', name: 'Apricot', hex: '#F8C291', colorNumber: 0xF8C291, emoji: '🥐', category: 'warm' },
  { id: 'bronze', name: 'Bronze', hex: '#CD6133', colorNumber: 0xCD6133, emoji: '🥉', category: 'warm' },
  { id: 'rose', name: 'Rose', hex: '#E91E63', colorNumber: 0xE91E63, emoji: '🌸', category: 'warm' },
  { id: 'blush', name: 'Blush', hex: '#FFB8D2', colorNumber: 0xFFB8D2, emoji: '🎀', category: 'warm' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#FF007F', colorNumber: 0xFF007F, emoji: '🌺', category: 'warm' },
  { id: 'hot_pink', name: 'Hot Pink', hex: '#FF1493', colorNumber: 0xFF1493, emoji: '💖', category: 'warm' },
  { id: 'magenta', name: 'Magenta', hex: '#D9138A', colorNumber: 0xD9138A, emoji: '🍧', category: 'warm' },

  // Cool, Earthy & Deep Hues
  { id: 'lime', name: 'Lime', hex: '#A3CB38', colorNumber: 0xA3CB38, emoji: '🍈', category: 'cool' },
  { id: 'emerald', name: 'Emerald', hex: '#2ECC71', colorNumber: 0x2ECC71, emoji: '🟩', category: 'cool' },
  { id: 'forest', name: 'Forest', hex: '#1F8B4C', colorNumber: 0x1F8B4C, emoji: '🌲', category: 'cool' },
  { id: 'mint', name: 'Mint', hex: '#00D166', colorNumber: 0x00D166, emoji: '🌿', category: 'cool' },
  { id: 'sage', name: 'Sage', hex: '#87A96B', colorNumber: 0x87A96B, emoji: '🍃', category: 'cool' },
  { id: 'teal', name: 'Teal', hex: '#1ABC9C', colorNumber: 0x1ABC9C, emoji: '🪸', category: 'cool' },
  { id: 'aqua', name: 'Aqua', hex: '#00D2D3', colorNumber: 0x00D2D3, emoji: '💧', category: 'cool' },
  { id: 'cyan', name: 'Cyan', hex: '#00BCD4', colorNumber: 0x00BCD4, emoji: '🩵', category: 'cool' },
  { id: 'sky_blue', name: 'Sky Blue', hex: '#3498DB', colorNumber: 0x3498DB, emoji: '🔹', category: 'cool' },
  { id: 'cobalt', name: 'Cobalt', hex: '#2E86DE', colorNumber: 0x2E86DE, emoji: '🔷', category: 'cool' },
  { id: 'sapphire', name: 'Sapphire', hex: '#206694', colorNumber: 0x206694, emoji: '🟦', category: 'cool' },
  { id: 'midnight', name: 'Midnight Blue', hex: '#1B2A4A', colorNumber: 0x1B2A4A, emoji: '🌌', category: 'cool' },
  { id: 'indigo', name: 'Indigo', hex: '#3F51B5', colorNumber: 0x3F51B5, emoji: '🔮', category: 'cool' },
  { id: 'lavender', name: 'Lavender', hex: '#A29BFE', colorNumber: 0xA29BFE, emoji: '🪻', category: 'cool' },
  { id: 'purple', name: 'Purple', hex: '#9B59B6', colorNumber: 0x9B59B6, emoji: '🟪', category: 'cool' },
  { id: 'amethyst', name: 'Amethyst', hex: '#71368A', colorNumber: 0x71368A, emoji: '🍇', category: 'cool' },
  { id: 'plum', name: 'Plum', hex: '#5C2C74', colorNumber: 0x5C2C74, emoji: '🍆', category: 'cool' },
  { id: 'silver', name: 'Silver', hex: '#BDC3C7', colorNumber: 0xBDC3C7, emoji: '🥈', category: 'cool' },
  { id: 'slate', name: 'Slate', hex: '#95A5A6', colorNumber: 0x95A5A6, emoji: '🪙', category: 'cool' },
  { id: 'charcoal', name: 'Charcoal', hex: '#546E7A', colorNumber: 0x546E7A, emoji: '🪨', category: 'cool' }
];

export function formatColorRoleName(name: string): string {
  const clean = name.replace(/^[✦✧🎨\s:]+/u, '').trim();
  return `${COLOR_ROLE_MARKER} ${clean}`;
}

export function findPaletteColor(query: string): ColorDefinition | undefined {
  const normalized = query.toLowerCase().trim().replace(/[\s-_]+/g, '');
  return COLOR_PALETTE.find(color => {
    const colorIdNorm = color.id.toLowerCase().replace(/[\s-_]+/g, '');
    const colorNameNorm = color.name.toLowerCase().replace(/[\s-_]+/g, '');
    return colorIdNorm === normalized || colorNameNorm === normalized;
  });
}

export function parseHexColor(input: string): { hex: string; colorNumber: number } | null {
  const trimmed = input.trim();
  const match6 = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (match6) {
    const hex = `#${match6[1].toUpperCase()}`;
    const colorNumber = parseInt(match6[1], 16);
    return { hex, colorNumber };
  }

  const match3 = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (match3) {
    const expanded = match3[1]
      .split('')
      .map(char => char + char)
      .join('')
      .toUpperCase();
    return { hex: `#${expanded}`, colorNumber: parseInt(expanded, 16) };
  }

  return null;
}

export function isColorRole(role: { name: string; color?: number }): boolean {
  const nameLower = role.name.toLowerCase().trim();
  if (COLOR_ROLE_PREFIXES.some(prefix => nameLower.startsWith(prefix.toLowerCase()))) {
    return true;
  }
  if (COLOR_PALETTE.some(c => c.name.toLowerCase() === nameLower || c.id === nameLower)) {
    return true;
  }
  return false;
}
