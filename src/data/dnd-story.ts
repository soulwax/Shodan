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

import { DndStoryKind, DndStoryVisibility } from '@prisma/client'

export const DND_STORY_LIMITS = {
  pageSize: 10,
  recentEntries: 10,
  bigPictureEntries: 100
} as const

export const DND_STORY_KIND_CHOICES = [
  { name: 'Event', value: DndStoryKind.EVENT },
  { name: 'NPC', value: DndStoryKind.NPC },
  { name: 'Location', value: DndStoryKind.LOCATION },
  { name: 'Clue', value: DndStoryKind.CLUE },
  { name: 'Quest', value: DndStoryKind.QUEST },
  { name: 'Lore', value: DndStoryKind.LORE }
] as const

export const DND_STORY_VISIBILITY_CHOICES = [
  { name: 'Shared with the campaign', value: DndStoryVisibility.SHARED },
  { name: 'DM only', value: DndStoryVisibility.DM_ONLY },
  { name: 'Private to me', value: DndStoryVisibility.PRIVATE }
] as const

export const DND_STORY_VISIBILITY_LABELS: Readonly<Record<DndStoryVisibility, string>> = {
  [DndStoryVisibility.SHARED]: 'shared',
  [DndStoryVisibility.DM_ONLY]: 'DM-only',
  [DndStoryVisibility.PRIVATE]: 'private'
}

const DND_STORY_VISIBILITY_MARKER_LABELS: Readonly<Record<DndStoryVisibility, string>> = {
  [DndStoryVisibility.SHARED]: '',
  [DndStoryVisibility.DM_ONLY]: 'DM only',
  [DndStoryVisibility.PRIVATE]: 'private'
}

export const DND_STORY_KIND_LABELS: Readonly<Record<DndStoryKind, string>> = {
  [DndStoryKind.EVENT]: 'Event',
  [DndStoryKind.NPC]: 'NPC',
  [DndStoryKind.LOCATION]: 'Location',
  [DndStoryKind.CLUE]: 'Clue',
  [DndStoryKind.QUEST]: 'Quest',
  [DndStoryKind.LORE]: 'Lore'
}

export function storyKindLabel(kind: DndStoryKind): string {
  return DND_STORY_KIND_LABELS[kind]
}

export function storyVisibilityLabel(visibility: DndStoryVisibility): string {
  return DND_STORY_VISIBILITY_LABELS[visibility]
}

export function storyVisibilityMarker(visibility: DndStoryVisibility): string {
  const label = DND_STORY_VISIBILITY_MARKER_LABELS[visibility]
  return label ? ` · ${label}` : ''
}
