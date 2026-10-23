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
