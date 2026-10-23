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

import { Events, Message } from 'discord.js'
import { prisma } from '../../services/prisma'
import { lockGuildUserHistory } from '../../services/message-history'
import { Event } from '../../types/event'
import { logger } from '../../utils/logger'

const messageCreateEvent: Event = {
  name: Events.MessageCreate,
  once: false,

  async execute(message: Message) {
    if (!message.guildId || message.author.bot) return
    const guildId = message.guildId

    try {
      await prisma.$transaction(async (transaction) => {
        await lockGuildUserHistory(transaction, guildId, message.author.id)
        const consent = await transaction.guildMessageHistoryConsent.findUnique(
          {
            where: {
              guildId_discordUserId: {
                guildId,
                discordUserId: message.author.id
              }
            }
          }
        )
        if (!consent) return

        const displayName =
          message.member?.displayName ?? message.author.displayName
        const avatarUrl =
          message.member?.displayAvatarURL({ size: 1024 }) ??
          message.author.displayAvatarURL({ size: 1024 })
        const history = await transaction.userMessageHistory.upsert({
          where: {
            guildId_discordUserId: {
              guildId,
              discordUserId: message.author.id
            }
          },
          create: {
            guildId,
            discordUserId: message.author.id,
            displayName,
            avatarUrl
          },
          update: { displayName, avatarUrl },
          select: { id: true }
        })

        await transaction.guildMessageHistory.createMany({
          data: [
            {
              historyId: history.id,
              discordMessageId: message.id,
              discordChannelId: message.channelId,
              content: message.content,
              createdAt: message.createdAt
            }
          ],
          skipDuplicates: true
        })
      })
    } catch (error) {
      logger.error(
        `Failed to save message ${message.id} from guild ${message.guildId}:`,
        error
      )
    }
  }
}

export default messageCreateEvent
