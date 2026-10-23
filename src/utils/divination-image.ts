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

import type { DivinationSpread } from '../data/divination-spreads';
import type { DrawnCard } from '../services/divination-reading';
import { loadCardImages } from '../rendering/divination/assets';
import { renderDivinationLayout } from '../rendering/divination/layouts';

/** Load card art and render the selected spread; absent art gets a labeled placeholder. */
export async function createDivinationSpreadImage(
  draws: DrawnCard[],
  spread: DivinationSpread,
  imageDirectory: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  if (!draws.length) return null;
  const images = await loadCardImages(draws, imageDirectory);
  return {
    buffer: renderDivinationLayout(draws, images, spread),
    filename: 'divination-spread.png'
  };
}
