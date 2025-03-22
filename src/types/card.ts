// File: src/types/card.ts



export interface Card {
  name: string;
  type: string;
  meaning_up: string;
  meaning_rev: string;
  desc: string;
  value_int: number;
  value?: string;
  suit?: string; // Optional because major arcana cards don't have suits
}