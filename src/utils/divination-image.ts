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
