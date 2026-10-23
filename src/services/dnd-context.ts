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

import { DndStoryKind, DndStoryVisibility } from '@prisma/client';
import { DND_STORY_LIMITS, storyKindLabel } from '../data/dnd-story';
import { DND_PROMPTS } from '../data/prompts/dnd';
import { getAIService } from './ai';
import { prisma } from './prisma';
import { logger } from '../utils/logger';
export { visibleStoryWhere } from '../utils/dnd-visibility';

export type NewCampaignStoryEntry = {
  campaignId: string;
  discordUserId: string;
  kind?: DndStoryKind;
  visibility?: DndStoryVisibility;
  content: string;
};

export async function interpretCampaignStoryEntry(
  campaignId: string,
  kind: DndStoryKind,
  content: string,
  excludeEntryId?: string
): Promise<string | null> {
  try {
    const [campaign, priorEntries] = await Promise.all([
      prisma.dndCampaign.findUnique({ where: { id: campaignId }, select: { storyBigPicture: true } }),
      prisma.dndStoryTidbit.findMany({
        where: { campaignId, visibility: DndStoryVisibility.SHARED, interpretation: { not: null }, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, kind: true, interpretation: true, content: true }
      })
    ]);
    const context = priorEntries.reverse().map(entry =>
      `[#${entry.id.slice(0, 8)}] [${storyKindLabel(entry.kind)}] ${entry.interpretation || entry.content}`
    );
    const response = await getAIService().generateText([
      {
        role: 'system',
        content: DND_PROMPTS.storyInterpretation.system
      },
      {
        role: 'user',
        content: DND_PROMPTS.storyInterpretation.user({ bigPicture: campaign?.storyBigPicture ?? null, recentEntries: context, kind: storyKindLabel(kind), content })
      }
    ], { temperature: 0.2, max_tokens: 180 });
    return response?.trim() || null;
  } catch (error) {
    logger.warn('[D&D] Could not interpret journal entry; it remains saved without an interpretation.');
    logger.debug('[D&D] Story interpretation error:', error);
    return null;
  }
}

export async function createCampaignStoryEntry(input: NewCampaignStoryEntry) {
  const kind = input.kind ?? DndStoryKind.EVENT;
  const interpretation = await interpretCampaignStoryEntry(input.campaignId, kind, input.content);
  return prisma.$transaction(async transaction => {
    const entry = await transaction.dndStoryTidbit.create({
      data: {
        ...input,
        kind,
        visibility: input.visibility ?? DndStoryVisibility.SHARED,
        interpretation,
        interpretedAt: interpretation ? new Date() : null
      }
    });
    await transaction.dndCampaign.update({
      where: { id: input.campaignId },
      data: { storyBigPicture: null, storyBigPictureUpdatedAt: null }
    });
    return entry;
  });
}

export async function updateCampaignStoryEntry(
  campaignId: string,
  entryId: string,
  content: string,
  visibility?: DndStoryVisibility
) {
  const existing = await prisma.dndStoryTidbit.findFirst({ where: { id: entryId, campaignId } });
  if (!existing) return null;
  const interpretation = await interpretCampaignStoryEntry(campaignId, existing.kind, content, entryId);
  return prisma.$transaction(async transaction => {
    const entry = await transaction.dndStoryTidbit.update({
      where: { id: entryId },
      data: { content, ...(visibility ? { visibility } : {}), interpretation, interpretedAt: interpretation ? new Date() : null }
    });
    await transaction.dndCampaign.update({
      where: { id: campaignId },
      data: { storyBigPicture: null, storyBigPictureUpdatedAt: null }
    });
    return entry;
  });
}

export async function deleteCampaignStoryEntry(campaignId: string, entryId: string) {
  return prisma.$transaction(async transaction => {
    const entry = await transaction.dndStoryTidbit.deleteMany({ where: { id: entryId, campaignId } });
    if (entry.count) {
      await transaction.dndCampaign.update({
        where: { id: campaignId },
        data: { storyBigPicture: null, storyBigPictureUpdatedAt: null }
      });
    }
    return entry.count > 0;
  });
}

export async function getRecentStory(campaignId: string, take: number = DND_STORY_LIMITS.recentEntries): Promise<string[]> {
  const [campaign, entries] = await Promise.all([
    prisma.dndCampaign.findUnique({ where: { id: campaignId }, select: { storyBigPicture: true } }),
    prisma.dndStoryTidbit.findMany({
      where: { campaignId, visibility: DndStoryVisibility.SHARED },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, kind: true, content: true, interpretation: true }
    })
  ]);
  const notes = entries.reverse().map(entry =>
    `[#${entry.id.slice(0, 8)}] [${storyKindLabel(entry.kind)}] ${entry.interpretation || entry.content}`
  );
  return [
    ...(campaign?.storyBigPicture ? [`Stored campaign big picture:\n${campaign.storyBigPicture}`] : []),
    ...notes
  ];
}
