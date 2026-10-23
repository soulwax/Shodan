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

import 'dotenv/config'
import {
  ChannelType,
  Client,
  DiscordAPIError,
  Events,
  GatewayIntentBits,
  GuildMember,
  Message,
  NewsChannel,
  TextChannel
} from 'discord.js'
import { prisma, disconnectPrisma } from '../services/prisma'
import { lockGuildUserHistory } from '../services/message-history'
import { logger } from '../utils/logger'

const MEMBER_BATCH_SIZE = 50
const MESSAGE_PAGE_SIZE = 100
type MessageChannel = TextChannel | NewsChannel

function isMessageChannel(channel: unknown): channel is MessageChannel {
  return channel instanceof TextChannel || channel instanceof NewsChannel
}

async function saveMemberProfile(
  guildId: string,
  discordUserId: string,
  displayName: string,
  avatarUrl: string
): Promise<string | null> {
  return prisma.$transaction(async (transaction) => {
    await lockGuildUserHistory(transaction, guildId, discordUserId)
    const consent = await transaction.guildMessageHistoryConsent.findUnique({
      where: { guildId_discordUserId: { guildId, discordUserId } },
      select: { backfillOptedInAt: true }
    })
    if (!consent?.backfillOptedInAt) return null

    const history = await transaction.userMessageHistory.upsert({
      where: { guildId_discordUserId: { guildId, discordUserId } },
      create: { guildId, discordUserId, displayName, avatarUrl },
      update: { displayName, avatarUrl }
    })
    return history.id
  })
}

function getMemberProfile(member: GuildMember): {
  displayName: string
  avatarUrl: string
} {
  return {
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ size: 1024 })
  }
}

function getAuthorProfile(message: Message): {
  displayName: string
  avatarUrl: string
} {
  return {
    displayName: message.member?.displayName ?? message.author.displayName,
    avatarUrl:
      message.member?.displayAvatarURL({ size: 1024 }) ??
      message.author.displayAvatarURL({ size: 1024 })
  }
}

async function initializeGuild(client: Client, guildId: string): Promise<void> {
  const guild = await client.guilds.fetch(guildId)
  logger.info(`Initializing message history for ${guild.name} (${guild.id})`)

  const members = await guild.members.fetch()
  const memberList = [...members.values()].filter((member) => !member.user.bot)
  let initializedProfiles = 0

  for (
    let offset = 0;
    offset < memberList.length;
    offset += MEMBER_BATCH_SIZE
  ) {
    const batch = memberList.slice(offset, offset + MEMBER_BATCH_SIZE)
    const histories = await Promise.all(
      batch.map(async (member) => {
        const profile = getMemberProfile(member)
        return saveMemberProfile(
          guild.id,
          member.id,
          profile.displayName,
          profile.avatarUrl
        )
      })
    )
    initializedProfiles += histories.filter(Boolean).length
  }

  let totalMessages = 0
  let skippedMessages = 0
  const channels = await guild.channels.fetch()
  for (const channel of channels.values()) {
    if (
      !isMessageChannel(channel) ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      continue
    }

    let before: string | undefined
    let hasMoreMessages = true
    while (hasMoreMessages) {
      let page
      try {
        page = await channel.messages.fetch({
          limit: MESSAGE_PAGE_SIZE,
          ...(before ? { before } : {})
        })
      } catch (error) {
        if (
          error instanceof DiscordAPIError &&
          (error.code === 50001 || error.code === 50013)
        ) {
          logger.warn(
            `Skipping inaccessible channel #${channel.name} in ${guild.name}: ${error.message}`
          )
          break
        }
        throw error
      }

      if (page.size === 0) break

      const pageMessages = [...page.values()].filter(
        (message) => !message.author.bot
      )
      const authorIds = [
        ...new Set(pageMessages.map((message) => message.author.id))
      ].sort()
      const savedCount = await prisma.$transaction(async (transaction) => {
        for (const userId of authorIds) {
          await lockGuildUserHistory(transaction, guild.id, userId)
        }

        const consents = authorIds.length
          ? await transaction.guildMessageHistoryConsent.findMany({
              where: {
                guildId: guild.id,
                discordUserId: { in: authorIds },
                backfillOptedInAt: { not: null }
              },
              select: { discordUserId: true }
            })
          : []
        const backfillConsentedIds = new Set(
          consents.map((consent) => consent.discordUserId)
        )
        const activeMessages = pageMessages.filter((message) =>
          backfillConsentedIds.has(message.author.id)
        )
        const historyIds = new Map<string, string>()

        for (const message of activeMessages) {
          if (historyIds.has(message.author.id)) continue
          const profile = getAuthorProfile(message)
          const history = await transaction.userMessageHistory.upsert({
            where: {
              guildId_discordUserId: {
                guildId: guild.id,
                discordUserId: message.author.id
              }
            },
            create: {
              guildId: guild.id,
              discordUserId: message.author.id,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            },
            update: {
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            },
            select: { id: true }
          })
          historyIds.set(message.author.id, history.id)
        }

        if (!activeMessages.length) return 0
        const result = await transaction.guildMessageHistory.createMany({
          data: activeMessages.map((message) => {
            const historyId = historyIds.get(message.author.id)
            if (!historyId)
              throw new Error(
                `No message history profile found for user ${message.author.id} in guild ${guild.id}`
              )
            return {
              historyId,
              discordMessageId: message.id,
              discordChannelId: channel.id,
              content: message.content,
              createdAt: message.createdAt
            }
          }),
          skipDuplicates: true
        })
        return result.count
      })
      totalMessages += savedCount
      skippedMessages += page.size - savedCount

      if (page.size < MESSAGE_PAGE_SIZE) {
        hasMoreMessages = false
      } else {
        before = page.last()?.id
        if (!before) hasMoreMessages = false
      }
    }

    logger.info(`Imported messages from #${channel.name} in ${guild.name}`)
  }

  logger.info(
    `Initialized profiles for ${initializedProfiles} members who explicitly opted in to backfill in ${guild.name}; saved ${totalMessages} messages and skipped ${skippedMessages} bot, non-consenting, or already saved messages`
  )
}

async function main(): Promise<void> {
  const token = process.env.BOT_TOKEN
  if (!token) throw new Error('BOT_TOKEN is required')

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ]
  })
  const ready = new Promise<void>((resolve) =>
    client.once(Events.ClientReady, () => resolve())
  )

  try {
    await client.login(token)
    await ready

    const guildIds = process.argv.slice(2)
    const targets =
      guildIds.length > 0
        ? guildIds
        : client.guilds.cache.map((guild) => guild.id)
    for (const guildId of targets) {
      await initializeGuild(client, guildId)
    }
  } finally {
    client.destroy()
    await disconnectPrisma()
  }
}

main().catch((error) => {
  logger.error('Failed to initialize message histories:', error)
  process.exitCode = 1
})
