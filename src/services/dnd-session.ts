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

import {
  DndSessionStatus,
  DndStoryKind,
  DndStoryVisibility,
  Prisma
} from '@prisma/client'
import { DND_PROMPTS } from '../data/prompts/dnd'
import { getAIService } from './ai'
import { prisma } from './prisma'
import { logger } from '../utils/logger'
import { truncateAtBoundary } from '../utils/text'

const ACTIVE_SESSION_STATUSES = [
  DndSessionStatus.ACTIVE,
  DndSessionStatus.REVIEWING
]

function isSerializationConflict(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2034'
  )
}

export async function startDndSession(input: {
  campaignId: string
  title: string
  agenda?: string | null
  startedByDiscordUserId: string
}) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.dndSession.findFirst({
          where: {
            campaignId: input.campaignId,
            status: { in: ACTIVE_SESSION_STATUSES }
          },
          orderBy: { createdAt: 'desc' }
        })
        if (existing) {
          throw new Error(
            existing.status === DndSessionStatus.REVIEWING
              ? 'The last session recap still needs review. Publish it before starting another session.'
              : `A session is already active: “${existing.title}”.`
          )
        }
        return transaction.dndSession.create({ data: input })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  } catch (error) {
    if (isSerializationConflict(error)) {
      const existing = await prisma.dndSession.findFirst({
        where: {
          campaignId: input.campaignId,
          status: { in: ACTIVE_SESSION_STATUSES }
        },
        orderBy: { createdAt: 'desc' }
      })
      if (existing) {
        throw new Error(
          existing.status === DndSessionStatus.REVIEWING
            ? 'The last session recap still needs review. Publish it before starting another session.'
            : `A session is already active: “${existing.title}”.`
        )
      }
    }
    throw error
  }
}

export async function addDndSessionNote(input: {
  campaignId: string
  discordUserId: string
  visibility: DndStoryVisibility
  content: string
}) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const session = await transaction.dndSession.findFirst({
          where: {
            campaignId: input.campaignId,
            status: DndSessionStatus.ACTIVE
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true }
        })
        if (!session)
          throw new Error(
            'There is no active session in this campaign. Start one with `/session start`.'
          )
        const note = await transaction.dndSessionNote.create({
          data: {
            sessionId: session.id,
            discordUserId: input.discordUserId,
            visibility: input.visibility,
            content: input.content
          }
        })
        return { session, note }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  } catch (error) {
    if (isSerializationConflict(error)) {
      throw new Error(
        'This session changed while the note was being saved. Check `/session status` and try again.'
      )
    }
    throw error
  }
}

export async function getDndSessionStatus(
  campaignId: string,
  userId: string,
  canViewDm: boolean
) {
  const session = await prisma.dndSession.findFirst({
    where: { campaignId, status: { in: ACTIVE_SESSION_STATUSES } },
    orderBy: { createdAt: 'desc' },
    include: {
      notes: {
        where: {
          OR: [
            { visibility: DndStoryVisibility.SHARED },
            ...(canViewDm ? [{ visibility: DndStoryVisibility.DM_ONLY }] : []),
            { visibility: DndStoryVisibility.DM_ONLY, discordUserId: userId },
            { visibility: DndStoryVisibility.PRIVATE, discordUserId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 8
      }
    }
  })
  return session ? { ...session, notes: session.notes.reverse() } : null
}

export async function endDndSession(campaignId: string) {
  const session = await prisma.dndSession.findFirst({
    where: { campaignId, status: DndSessionStatus.ACTIVE },
    orderBy: { createdAt: 'desc' },
    include: {
      notes: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })
  if (!session) throw new Error('There is no active session to end.')
  const sharedNotes = session.notes.filter(
    (note) => note.visibility === DndStoryVisibility.SHARED
  )

  let recapDraft: string | null = null
  if (sharedNotes.length) {
    try {
      recapDraft = await getAIService().generateText(
        [
          {
            role: 'system',
            content: DND_PROMPTS.sessionRecap.system
          },
          {
            role: 'user',
            content: DND_PROMPTS.sessionRecap.user({
              title: session.title,
              agenda: session.agenda,
              date: session.createdAt.toISOString(),
              notes: sharedNotes.map(
                (note) => `- <@${note.discordUserId}>: ${note.content}`
              )
            })
          }
        ],
        { temperature: 0.2, max_tokens: 700 }
      )
      recapDraft = recapDraft?.trim() || null
    } catch (error) {
      logger.warn(
        '[D&D] Session recap generation failed; shared notes are preserved for review.'
      )
      logger.debug('[D&D] Session recap error:', error)
    }
  }
  recapDraft = truncateAtBoundary(
    recapDraft ??
      DND_PROMPTS.sessionRecap.fallback(
        session.title,
        session.agenda,
        sharedNotes
      ),
    3800
  )

  try {
    await prisma.$transaction(
      async (transaction) => {
        const currentNoteCount = await transaction.dndSessionNote.count({
          where: { sessionId: session.id }
        })
        if (currentNoteCount !== session.notes.length) {
          throw new Error(
            'New session notes arrived while the recap was being prepared. Run `/session end` again to include them.'
          )
        }
        const updated = await transaction.dndSession.updateMany({
          where: { id: session.id, status: DndSessionStatus.ACTIVE },
          data: { status: DndSessionStatus.REVIEWING, recapDraft }
        })
        if (!updated.count)
          throw new Error(
            'This session changed while the recap was being prepared. Check `/session status`.'
          )
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  } catch (error) {
    if (isSerializationConflict(error)) {
      throw new Error(
        'New session notes arrived while the recap was being prepared. Run `/session end` again to include them.'
      )
    }
    throw error
  }
  return { ...session, status: DndSessionStatus.REVIEWING, recapDraft }
}

export async function publishDndSessionRecap(input: {
  campaignId: string
  recap: string
  discordUserId: string
}) {
  return prisma.$transaction(
    async (transaction) => {
      const session = await transaction.dndSession.findFirst({
        where: {
          campaignId: input.campaignId,
          status: DndSessionStatus.REVIEWING
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true }
      })
      if (!session)
        throw new Error(
          'I couldn’t find a recap awaiting review in this campaign.'
        )

      const closed = await transaction.dndSession.updateMany({
        where: { id: session.id, status: DndSessionStatus.REVIEWING },
        data: { status: DndSessionStatus.ENDED, endedAt: new Date() }
      })
      if (!closed.count) throw new Error('This recap was already published.')

      const entry = await transaction.dndStoryTidbit.create({
        data: {
          campaignId: input.campaignId,
          discordUserId: input.discordUserId,
          kind: DndStoryKind.EVENT,
          visibility: DndStoryVisibility.SHARED,
          content: `Session recap — ${session.title}\n\n${input.recap.trim()}`
        }
      })
      await transaction.dndCampaign.update({
        where: { id: input.campaignId },
        data: { storyBigPicture: null, storyBigPictureUpdatedAt: null }
      })
      return entry
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}
