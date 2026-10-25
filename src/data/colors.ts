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
  { id: 'crimson', name: 'Crimson', hex: '#E74C3C', colorNumber: 0xE74C3C, emoji: '🟥' },
  { id: 'coral', name: 'Coral', hex: '#E67E22', colorNumber: 0xE67E22, emoji: '🟧' },
  { id: 'amber', name: 'Amber', hex: '#F39C12', colorNumber: 0xF39C12, emoji: '🟧' },
  { id: 'gold', name: 'Gold', hex: '#F1C40F', colorNumber: 0xF1C40F, emoji: '🟨' },
  { id: 'emerald', name: 'Emerald', hex: '#2ECC71', colorNumber: 0x2ECC71, emoji: '🟩' },
  { id: 'forest', name: 'Forest', hex: '#1F8B4C', colorNumber: 0x1F8B4C, emoji: '🌲' },
  { id: 'mint', name: 'Mint', hex: '#00D166', colorNumber: 0x00D166, emoji: '🌿' },
  { id: 'teal', name: 'Teal', hex: '#1ABC9C', colorNumber: 0x1ABC9C, emoji: '🪸' },
  { id: 'cyan', name: 'Cyan', hex: '#00BCD4', colorNumber: 0x00BCD4, emoji: '🩵' },
  { id: 'sky_blue', name: 'Sky Blue', hex: '#3498DB', colorNumber: 0x3498DB, emoji: '🔹' },
  { id: 'sapphire', name: 'Sapphire', hex: '#206694', colorNumber: 0x206694, emoji: '🟦' },
  { id: 'indigo', name: 'Indigo', hex: '#3F51B5', colorNumber: 0x3F51B5, emoji: '🔮' },
  { id: 'purple', name: 'Purple', hex: '#9B59B6', colorNumber: 0x9B59B6, emoji: '🟪' },
  { id: 'rose', name: 'Rose', hex: '#E91E63', colorNumber: 0xE91E63, emoji: '🌸' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#FF007F', colorNumber: 0xFF007F, emoji: '🌺' },
  { id: 'slate', name: 'Slate', hex: '#95A5A6', colorNumber: 0x95A5A6, emoji: '🪙' }
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
