import { DndStoryVisibility, Prisma } from '@prisma/client';

/** Shared notes are visible to everyone; secret and personal notes remain scoped. */
export function visibleStoryWhere(userId: string, canViewDm: boolean): Prisma.DndStoryTidbitWhereInput {
  return {
    OR: [
      { visibility: DndStoryVisibility.SHARED },
      ...(canViewDm ? [{ visibility: DndStoryVisibility.DM_ONLY }] : []),
      { visibility: DndStoryVisibility.DM_ONLY, discordUserId: userId },
      { visibility: DndStoryVisibility.PRIVATE, discordUserId: userId }
    ]
  };
}
