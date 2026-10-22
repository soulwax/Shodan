import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { lockGuildUserHistory } from '../../services/message-history';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const privacyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('Choose whether Shodan stores message history for you in this server.')
    .addSubcommand(command => command
      .setName('status')
      .setDescription('Check your message history setting and saved message count.'))
    .addSubcommand(command => command
      .setName('history-off')
      .setDescription('Stop storing your future messages and delete your saved history here.'))
    .addSubcommand(command => command
      .setName('history-on')
      .setDescription('Opt in to storing future messages in this server.'))
    .addSubcommand(command => command
      .setName('history-backfill')
      .setDescription('Separately opt in to importing your older accessible posts.')),
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
        const [consent, history] = await Promise.all([
          prisma.guildMessageHistoryConsent.findUnique({
            where: { guildId_discordUserId: { guildId, discordUserId } }
          }),
          prisma.userMessageHistory.findUnique({
            where: { guildId_discordUserId: { guildId, discordUserId } },
            select: { _count: { select: { messages: true } } }
          })
        ]);

        if (!consent) {
          await interaction.editReply('Your message history is **off** for this server. Shodan stores nothing unless you opt in with `/privacy history-on`. Use `/privacy history-backfill` separately if you also want older accessible posts imported.');
          return;
        }
        const backfillText = consent.backfillOptedInAt
          ? 'may be imported by the server history initializer'
          : 'are not included; use `/privacy history-backfill` to opt in separately';
        await interaction.editReply(`Your message history is **on** for future messages in this server. Shodan has ${history?._count.messages ?? 0} saved message${history?._count.messages === 1 ? '' : 's'} for you. Older posts ${backfillText}. Use /privacy history-off to stop collection and delete your saved history.`);
        return;
      }

      if (action === 'history-off') {
        const deletedMessages = await prisma.$transaction(async transaction => {
          await lockGuildUserHistory(transaction, guildId, discordUserId);
          await transaction.guildMessageHistoryConsent.deleteMany({
            where: { guildId, discordUserId }
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

      if (action === 'history-on') {
        await prisma.$transaction(async transaction => {
          await lockGuildUserHistory(transaction, guildId, discordUserId);
          await transaction.guildMessageHistoryConsent.upsert({
            where: { guildId_discordUserId: { guildId, discordUserId } },
            create: { guildId, discordUserId },
            update: {}
          });
        });
        await interaction.editReply('You opted in to saving **future** messages in this server. Older messages are not imported unless you separately use `/privacy history-backfill`. Use `/privacy history-off` to revoke consent and delete saved history.');
        return;
      }

      const backfillStatus = await prisma.$transaction(async transaction => {
        await lockGuildUserHistory(transaction, guildId, discordUserId);
        const consent = await transaction.guildMessageHistoryConsent.findUnique({
          where: { guildId_discordUserId: { guildId, discordUserId } },
          select: { backfillOptedInAt: true }
        });
        if (!consent) return 'history-off';
        if (consent.backfillOptedInAt) return 'already-enabled';
        await transaction.guildMessageHistoryConsent.update({
          where: { guildId_discordUserId: { guildId, discordUserId } },
          data: { backfillOptedInAt: new Date() }
        });
        return 'enabled';
      });
      await interaction.editReply(backfillStatus === 'history-off'
        ? 'First opt in to future message history with `/privacy history-on`. Older posts require a separate opt-in.'
        : backfillStatus === 'already-enabled'
          ? 'You have already opted in to importing older accessible posts. A server manager can run the history initializer to import them.'
          : 'You opted in to importing older accessible posts in this server. A server manager can run the history initializer. Use `/privacy history-off` to revoke both consents and delete your saved history.');
    } catch (error) {
      logger.error('[Privacy] Failed to read or update message history preference:', error);
      await interaction.editReply('I couldn’t update your message history setting. Please try again.');
    }
  }
};

export default privacyCommand;
