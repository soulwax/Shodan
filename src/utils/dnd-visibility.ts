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
