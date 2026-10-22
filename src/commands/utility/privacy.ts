import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { lockGuildUserHistory } from '../../services/message-history';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const privacyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('Manage the message history Shodan stores for you in this server.')
    .addSubcommand(command => command
      .setName('status')
      .setDescription('Check your message history setting and saved message count.'))
    .addSubcommand(command => command
      .setName('history-off')
      .setDescription('Stop storing your future messages and delete your saved history here.'))
    .addSubcommand(command => command
      .setName('history-on')
      .setDescription('Allow Shodan to store future messages in this server again.')),
  category: 'utility',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Message history settings are per-server. Use this command inside a server.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;
    const action = interaction.options.getSubcommand();

    try {
      if (action === 'status') {
        const [optOut, history] = await Promise.all([
          prisma.guildMessageHistoryOptOut.findUnique({
            where: { guildId_discordUserId: { guildId, discordUserId } }
          }),
          prisma.userMessageHistory.findUnique({
            where: { guildId_discordUserId: { guildId, discordUserId } },
            select: { _count: { select: { messages: true } } }
          })
        ]);

        await interaction.editReply(optOut
          ? 'Your message history is **off** for this server. Saved messages and your profile were deleted; I retain only this opt-out flag so future messages stay out of history. Use `/privacy history-on` to resume collection.'
          : `Your message history is **on** for this server. Shodan has ${history?._count.messages ?? 0} saved message${history?._count.messages === 1 ? '' : 's'} for you. Use /privacy history-off to stop collection and delete them.`);
        return;
      }

      if (action === 'history-off') {
        const deletedMessages = await prisma.$transaction(async transaction => {
          await lockGuildUserHistory(transaction, guildId, discordUserId);
          await transaction.guildMessageHistoryOptOut.upsert({
            where: { guildId_discordUserId: { guildId, discordUserId } },
            create: { guildId, discordUserId },
            update: { optedOutAt: new Date() }
          });

          const history = await transaction.userMessageHistory.findUnique({
            where: { guildId_discordUserId: { guildId, discordUserId } },
            select: { id: true, _count: { select: { messages: true } } }
          });
          if (history) {
            await transaction.userMessageHistory.delete({ where: { id: history.id } });
          }
          return history?._count.messages ?? 0;
        });

        await interaction.editReply(`Message history is now **off** for this server. I deleted your saved profile and ${deletedMessages} saved message${deletedMessages === 1 ? '' : 's'}. Your style profile is separate; use /style forget to delete it.`);
        return;
      }

      await prisma.$transaction(async transaction => {
        await lockGuildUserHistory(transaction, guildId, discordUserId);
        await transaction.guildMessageHistoryOptOut.deleteMany({
          where: { guildId, discordUserId }
        });
      });
      await interaction.editReply('Message history is now **on** for this server. New messages may be saved from now on; previously deleted messages will not return.');
    } catch (error) {
      logger.error('[Privacy] Failed to read or update message history preference:', error);
      await interaction.editReply('I couldn’t update your message history setting. Please try again.');
    }
  }
};

export default privacyCommand;
