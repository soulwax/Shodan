import fs from 'fs';
import path from 'path';
import type { Card } from '../types/card';

/** Resolve bundled assets from this module, regardless of the launch directory. */
export function loadTarotDeck(): Card[] {
  const filename = path.join(__dirname, '../../static/card-data.json');
  const data = JSON.parse(fs.readFileSync(filename, 'utf8')) as { cards: Card[] };
  return data.cards;
}
