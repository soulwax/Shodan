import type { CanvasRenderingContext2D, Image } from 'canvas';

export type DrawingContext = CanvasRenderingContext2D;
export type CardImage = Image;

export interface Point {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
}
