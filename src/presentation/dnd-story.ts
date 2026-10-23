import { DndStoryVisibility } from '@prisma/client';
import type { DndStoryKind } from '@prisma/client';
import { truncateAtBoundary } from '../utils/text';
import { storyKindLabel } from '../utils/dnd-story';

interface StorySnippet {
  id: string;
  kind: DndStoryKind;
  content: string;
  interpretation: string | null;
  visibility: DndStoryVisibility;
  createdAt: Date;
  discordUserId: string;
}

export function formatStorySnippet(entry: StorySnippet): string {
  const content = truncateAtBoundary(entry.content, 170);
  const interpretation = entry.interpretation ? `\n🧠 ${truncateAtBoundary(entry.interpretation, 80)}` : '';
  const visibilityLabel = entry.visibility === DndStoryVisibility.DM_ONLY ? ' · DM only'
    : entry.visibility === DndStoryVisibility.PRIVATE ? ' · private' : '';
  return `**[#${entry.id.slice(0, 8)}] ${storyKindLabel(entry.kind)}${visibilityLabel}** · <t:${Math.floor(entry.createdAt.getTime() / 1000)}:d>\n${content}${interpretation}\nAdded by <@${entry.discordUserId}>`;
}
