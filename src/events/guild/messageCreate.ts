import { Events, Message } from 'discord.js';
import { prisma } from '../../services/prisma';
import { Event } from '../../types/event';
import { logger } from '../../utils/logger';

const messageCreateEvent: Event = {
  name: Events.MessageCreate,
  once: false,

  async execute(message: Message) {
    if (!message.guildId || message.author.bot) return;

    try {
      const displayName = message.member?.displayName ?? message.author.displayName;
      const avatarUrl = message.member?.displayAvatarURL({ size: 1024 }) ??
        message.author.displayAvatarURL({ size: 1024 });
      const history = await prisma.userMessageHistory.upsert({
        where: {
          guildId_discordUserId: {
            guildId: message.guildId,
            discordUserId: message.author.id
          }
        },
        create: {
          guildId: message.guildId,
          discordUserId: message.author.id,
          displayName,
          avatarUrl
        },
        update: { displayName, avatarUrl },
        select: { id: true }
      });

      await prisma.guildMessageHistory.createMany({
        data: [{
          historyId: history.id,
          discordMessageId: message.id,
          discordChannelId: message.channelId,
          content: message.content,
          createdAt: message.createdAt
        }],
        skipDuplicates: true
      });
    } catch (error) {
      logger.error(`Failed to save message ${message.id} from guild ${message.guildId}:`, error);
    }
  }
};

export default messageCreateEvent;
