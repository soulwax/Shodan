import { Prisma } from '@prisma/client';
import {
  ChannelType,
  DiscordAPIError,
  Guild,
  Message,
  NewsChannel,
  TextChannel
} from 'discord.js';
import { prisma } from './prisma';

/** Serialize capture and privacy changes for one user in one server. */
export async function lockGuildUserHistory(
  transaction: Prisma.TransactionClient,
  guildId: string,
  discordUserId: string
): Promise<void> {
  const lockKey = `${guildId}:${discordUserId}`;
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}

const MESSAGE_PAGE_SIZE = 100;
type MessageChannel = TextChannel | NewsChannel;

function isMessageChannel(channel: unknown): channel is MessageChannel {
  return channel instanceof TextChannel || channel instanceof NewsChannel;
}

function isMissingChannelAccess(error: unknown): boolean {
  return error instanceof DiscordAPIError &&
    (error.code === 50001 || error.code === 50013);
}

function getMessageAuthorProfile(message: Message): {
  displayName: string;
  avatarUrl: string;
} {
  return {
    displayName: message.member?.displayName ?? message.author.displayName,
    avatarUrl: message.member?.displayAvatarURL({ size: 1024 }) ??
      message.author.displayAvatarURL({ size: 1024 })
  };
}

export type UserHistoryBackfillResult = {
  optedIn: boolean;
  consentRevoked: boolean;
  messagesFound: number;
  messagesSaved: number;
  inaccessibleChannels: number;
};

/** Import accessible older posts for one user who separately opted in. */
export async function backfillUserMessageHistory(
  guild: Guild,
  discordUserId: string
): Promise<UserHistoryBackfillResult> {
  const consent = await prisma.guildMessageHistoryConsent.findUnique({
    where: { guildId_discordUserId: { guildId: guild.id, discordUserId } },
    select: { backfillOptedInAt: true }
  });
  if (!consent?.backfillOptedInAt) {
    return {
      optedIn: false,
      consentRevoked: false,
      messagesFound: 0,
      messagesSaved: 0,
      inaccessibleChannels: 0
    };
  }

  let messagesFound = 0;
  let messagesSaved = 0;
  let inaccessibleChannels = 0;
  let consentRevoked = false;
  const channels = await guild.channels.fetch();

  for (const channel of channels.values()) {
    if (
      !isMessageChannel(channel) ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      continue;
    }

    let before: string | undefined;
    while (!consentRevoked) {
      const activeConsent = await prisma.guildMessageHistoryConsent.findUnique({
        where: { guildId_discordUserId: { guildId: guild.id, discordUserId } },
        select: { backfillOptedInAt: true }
      });
      if (!activeConsent?.backfillOptedInAt) {
        consentRevoked = true;
        break;
      }

      let page;
      try {
        page = await channel.messages.fetch({
          limit: MESSAGE_PAGE_SIZE,
          ...(before ? { before } : {})
        });
      } catch (error) {
        if (isMissingChannelAccess(error)) {
          inaccessibleChannels += 1;
          break;
        }
        throw error;
      }

      if (page.size === 0) break;

      const userMessages = [...page.values()].filter(message =>
        message.author.id === discordUserId && !message.author.bot
      );
      messagesFound += userMessages.length;

      if (userMessages.length) {
        const savedCount = await prisma.$transaction(async transaction => {
          await lockGuildUserHistory(transaction, guild.id, discordUserId);
          const activeConsent = await transaction.guildMessageHistoryConsent.findUnique({
            where: { guildId_discordUserId: { guildId: guild.id, discordUserId } },
            select: { backfillOptedInAt: true }
          });
          if (!activeConsent?.backfillOptedInAt) return null;

          const profile = getMessageAuthorProfile(userMessages[0]);
          const history = await transaction.userMessageHistory.upsert({
            where: { guildId_discordUserId: { guildId: guild.id, discordUserId } },
            create: {
              guildId: guild.id,
              discordUserId,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            },
            update: {
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            },
            select: { id: true }
          });

          const result = await transaction.guildMessageHistory.createMany({
            data: userMessages.map(message => ({
              historyId: history.id,
              discordMessageId: message.id,
              discordChannelId: channel.id,
              content: message.content,
              createdAt: message.createdAt
            })),
            skipDuplicates: true
          });
          return result.count;
        });

        if (savedCount === null) {
          consentRevoked = true;
          break;
        }
        messagesSaved += savedCount;
      }

      if (page.size < MESSAGE_PAGE_SIZE) break;
      before = page.last()?.id;
      if (!before) break;
    }

    if (consentRevoked) break;
  }

  return {
    optedIn: true,
    consentRevoked,
    messagesFound,
    messagesSaved,
    inaccessibleChannels
  };
}
