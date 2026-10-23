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

import { DndStoryVisibility } from '@prisma/client'
import type { DndStoryKind } from '@prisma/client'
import { truncateAtBoundary } from '../utils/text'
import { storyKindLabel, storyVisibilityMarker } from '../data/dnd-story'

interface StorySnippet {
  id: string
  kind: DndStoryKind
  content: string
  interpretation: string | null
  visibility: DndStoryVisibility
  createdAt: Date
  discordUserId: string
}

export function formatStorySnippet(entry: StorySnippet): string {
  const content = truncateAtBoundary(entry.content, 170)
  const interpretation = entry.interpretation
    ? `\n🧠 ${truncateAtBoundary(entry.interpretation, 80)}`
    : ''
  const visibilityLabel = storyVisibilityMarker(entry.visibility)
  return `**[#${entry.id.slice(0, 8)}] ${storyKindLabel(entry.kind)}${visibilityLabel}** · <t:${Math.floor(entry.createdAt.getTime() / 1000)}:d>\n${content}${interpretation}\nAdded by <@${entry.discordUserId}>`
}
