import 'dotenv/config';
import {
  ChannelType,
  Client,
  DiscordAPIError,
  Events,
  GatewayIntentBits,
  GuildMember,
  Message,
  NewsChannel,
  TextChannel,
  User
} from 'discord.js';
import { prisma, disconnectPrisma } from '../services/prisma';
import { logger } from '../utils/logger';

const MEMBER_BATCH_SIZE = 50;
const MESSAGE_PAGE_SIZE = 100;
type MessageChannel = TextChannel | NewsChannel;

function isMessageChannel(channel: unknown): channel is MessageChannel {
  return channel instanceof TextChannel || channel instanceof NewsChannel;
}

async function saveMemberProfile(
  guildId: string,
  discordUserId: string,
  displayName: string,
  avatarUrl: string
): Promise<string> {
  const history = await prisma.userMessageHistory.upsert({
    where: { guildId_discordUserId: { guildId, discordUserId } },
    create: { guildId, discordUserId, displayName, avatarUrl },
    update: { displayName, avatarUrl }
  });

  return history.id;
}

function getMemberProfile(member: GuildMember): { displayName: string; avatarUrl: string } {
  return {
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ size: 1024 })
  };
}

function getAuthorProfile(message: Message): {
  user: User;
  displayName: string;
  avatarUrl: string;
} {
  return {
    user: message.author,
    displayName: message.member?.displayName ?? message.author.displayName,
    avatarUrl: message.member?.displayAvatarURL({ size: 1024 }) ?? message.author.displayAvatarURL({ size: 1024 })
  };
}

async function initializeGuild(client: Client, guildId: string): Promise<void> {
  const guild = await client.guilds.fetch(guildId);
  logger.info(`Initializing message history for ${guild.name} (${guild.id})`);

  const members = await guild.members.fetch();
  const historyIds = new Map<string, string>();
  const memberList = [...members.values()];

  for (let offset = 0; offset < memberList.length; offset += MEMBER_BATCH_SIZE) {
    const batch = memberList.slice(offset, offset + MEMBER_BATCH_SIZE);
    const histories = await Promise.all(batch.map(async member => {
      const profile = getMemberProfile(member);
      const id = await saveMemberProfile(guild.id, member.id, profile.displayName, profile.avatarUrl);
      return [member.id, id] as const;
    }));
    for (const [userId, historyId] of histories) historyIds.set(userId, historyId);
  }

  let totalMessages = 0;
  let skippedMessages = 0;
  const channels = await guild.channels.fetch();
  for (const channel of channels.values()) {
    if (
      !isMessageChannel(channel) ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      continue;
    }

    let before: string | undefined;
    let hasMoreMessages = true;
    while (hasMoreMessages) {
      let page;
      try {
        page = await channel.messages.fetch({
          limit: MESSAGE_PAGE_SIZE,
          ...(before ? { before } : {})
        });
      } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
          logger.warn(`Skipping inaccessible channel #${channel.name} in ${guild.name}: ${error.message}`);
          break;
        }
        throw error;
      }

      if (page.size === 0) break;

      const pageProfiles = new Map<string, { displayName: string; avatarUrl: string }>();
      for (const message of page.values()) {
        if (!historyIds.has(message.author.id)) {
          const { displayName, avatarUrl } = getAuthorProfile(message);
          pageProfiles.set(message.author.id, { displayName, avatarUrl });
        }
      }

      for (const [userId, profile] of pageProfiles) {
        const historyId = await saveMemberProfile(guild.id, userId, profile.displayName, profile.avatarUrl);
        historyIds.set(userId, historyId);
      }

      const pageMessages = [...page.values()];
      const savedMessages = await prisma.guildMessageHistory.findMany({
        where: { discordMessageId: { in: pageMessages.map(message => message.id) } },
        select: { discordMessageId: true }
      });
      const savedMessageIds = new Set(savedMessages.map(message => message.discordMessageId));
      const newMessages = pageMessages.filter(message => !savedMessageIds.has(message.id));
      skippedMessages += pageMessages.length - newMessages.length;

      if (newMessages.length > 0) {
        const result = await prisma.guildMessageHistory.createMany({
          data: newMessages.map(message => {
          const historyId = historyIds.get(message.author.id);
          if (!historyId) {
            throw new Error(`No message history profile found for user ${message.author.id} in guild ${guild.id}`);
          }
          return {
            historyId,
            discordMessageId: message.id,
            discordChannelId: channel.id,
            content: message.content,
            createdAt: message.createdAt
          };
          }),
          skipDuplicates: true
        });
        totalMessages += result.count;
      }

      if (page.size < MESSAGE_PAGE_SIZE) {
        hasMoreMessages = false;
      } else {
        before = page.last()?.id;
        if (!before) hasMoreMessages = false;
      }
    }

    logger.info(`Imported messages from #${channel.name} in ${guild.name}`);
  }

  logger.info(
    `Initialized ${historyIds.size} user histories in ${guild.name}; saved ${totalMessages} new messages and skipped ${skippedMessages} already saved messages`
  );
}

async function main(): Promise<void> {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN is required');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]
  });
  const ready = new Promise<void>(resolve => client.once(Events.ClientReady, () => resolve()));

  try {
    await client.login(token);
    await ready;

    const guildIds = process.argv.slice(2);
    const targets = guildIds.length > 0 ? guildIds : client.guilds.cache.map(guild => guild.id);
    for (const guildId of targets) {
      await initializeGuild(client, guildId);
    }
  } finally {
    client.destroy();
    await disconnectPrisma();
  }
}

main().catch(error => {
  logger.error('Failed to initialize message histories:', error);
  process.exitCode = 1;
});
