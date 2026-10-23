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

import type { DndStoryKind, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { visibleStoryWhere } from '../utils/dnd-visibility';
import { getQuestionSearchTerms, rankCampaignStoryEntries } from '../utils/dnd-story-search';
export { getQuestionSearchTerms, rankCampaignStoryEntries } from '../utils/dnd-story-search';

export function makeStoryWhere(
  campaignId: string,
  userId: string,
  canViewDm: boolean,
  options: { kind?: DndStoryKind; query?: string } = {}
): Prisma.DndStoryTidbitWhereInput {
  const { kind, query } = options;
  const filters: Prisma.DndStoryTidbitWhereInput[] = [visibleStoryWhere(userId, canViewDm)];
  if (kind) filters.push({ kind });
  if (query) filters.push({
    OR: [
      { content: { contains: query, mode: 'insensitive' } },
      { interpretation: { contains: query, mode: 'insensitive' } }
    ]
  });
  return {
    campaignId,
    AND: filters
  };
}
export async function findStoryEntriesByReference(campaignId: string, reference: string, userId: string, canViewDm: boolean) {
  return prisma.dndStoryTidbit.findMany({
    where: { campaignId, AND: [visibleStoryWhere(userId, canViewDm), { id: { startsWith: reference.toLowerCase() } }] },
    take: 2
  });
}

export async function findRelevantCampaignStoryEntries(
  campaignId: string,
  userId: string,
  canViewDm: boolean,
  question: string
) {
  const terms = getQuestionSearchTerms(question);
  const candidates = await prisma.dndStoryTidbit.findMany({
    where: {
      campaignId,
      AND: [
        visibleStoryWhere(userId, canViewDm),
        ...(terms.length ? [{ OR: terms.flatMap(term => [
          { content: { contains: term, mode: 'insensitive' as const } },
          { interpretation: { contains: term, mode: 'insensitive' as const } }
        ]) }] : [])
      ]
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: terms.length ? 80 : 20
  });
  const ranked = rankCampaignStoryEntries(candidates, terms);
  if (ranked.length) return ranked;

  // Semantic questions may use different words from the notes, so include recent context.
  return prisma.dndStoryTidbit.findMany({
    where: { campaignId, ...visibleStoryWhere(userId, canViewDm) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 12
  });
}
