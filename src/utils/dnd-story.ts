import type { DndStoryKind } from '@prisma/client';

export function storyKindLabel(kind: DndStoryKind): string {
  return kind.charAt(0) + kind.slice(1).toLowerCase();
}
