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

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { lockGuildUserHistory } from '../../services/message-history';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

function privacyExplanation(): EmbedBuilder {
  const controller = process.env.PRIVACY_CONTROLLER_NAME?.trim().slice(0, 200);
  const contact = process.env.PRIVACY_CONTACT?.trim().slice(0, 200);
  let noticeUrl: string | null = null;
  try {
    const url = new URL(process.env.PRIVACY_NOTICE_URL ?? '');
    if (url.protocol === 'https:') noticeUrl = url.href.slice(0, 300);
  } catch {
    // The summary still works when the operator has not configured a notice URL.
  }

  return new EmbedBuilder()
    .setTitle('Shodan · Privacy and your data')
    .setColor(0x586b4d)
    .setDescription('Message history preferences apply separately in each server. Use `/privacy status` there to see your setting and saved message count.')
    .addFields(
      {
        name: 'Optional message history',
        value: 'Off by default. `/privacy history-on` permits saving future posts the bot can see in this server: message text, message and channel IDs, timestamp, your Discord ID, display name, and avatar URL. `/privacy history-backfill` separately permits importing your older accessible posts; run `/history-backfill` to start that import. DMs and attachments are not saved as message history. Saved posts can inform `/compliment`.'
      },
      {
        name: 'Style and campaign records',
        value: '`/style learn` stores writing statistics, not the sample itself. D&D commands store server and campaign settings, character sheets and memories, journal entries and AI summaries, session notes and recaps, encounters, coin balances and transactions, with Discord IDs and timestamps. Other players may create campaign notes that mention you.'
      },
      {
        name: 'AI, Discord, and logs',
        value: 'AI commands may send your prompt or image and relevant saved context to a configured provider: Google Gemini, OpenAI, Cloudflare, xAI, or Anthropic. Routine tarot readings and command history are not saved in the bot database. Replies and files posted to Discord remain there. Technical error and query logs may persist separately.'
      },
      {
        name: 'Retention and deletion',
        value: 'The bot sets no automatic expiry for saved history, style, campaign records, or logs. `/privacy history-off` revokes both history permissions and deletes your saved messages and history profile in this server. `/style forget` deletes your style profile. `/purge-char` deletes your Main Campaign character and memories; `/story delete` removes a journal entry you authored. Ask the operator about other campaign records, logs, and copies held by Discord or AI providers.'
      },
      {
        name: 'Controller, contact, and DSGVO / GDPR rights',
        value: `Controller: ${controller || 'ask a server manager who operates this bot instance'}.\nPrivacy contact: ${contact || 'ask a server manager to connect you with the operator'}.\nYou can request access, correction, erasure, restriction, objection, or portability, withdraw optional consent, and complain to a data protection authority.${noticeUrl ? `\nFull privacy notice: ${noticeUrl}` : '\nAsk the operator for the legal basis, active providers, and transfer details for this deployment.'}`
      }
    );
}

const privacyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('Manage message history and learn what Shodan stores and deletes.')
    .addSubcommand(command => command
      .setName('explain')
      .setDescription('See what Shodan stores, shares, keeps, and how to delete it.'))
    .addSubcommand(command => command
      .setName('status')
      .setDescription('Check your message history setting and saved message count.'))
    .addSubcommand(command => command
      .setName('history-off')
      .setDescription('Stop storing your future messages and delete your saved history here.'))
    .addSubcommand(command => command
      .setName('history-on')
      .setDescription('Opt in to saving future posts here; read /privacy explain first.'))
    .addSubcommand(command => command
      .setName('history-backfill')
      .setDescription('Separately opt in to older accessible posts; read /privacy explain first.')),
  category: 'utility',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const action = interaction.options.getSubcommand();
    if (action === 'explain') {
      await interaction.reply({
        embeds: [privacyExplanation()],
        ...(interaction.guildId ? { ephemeral: true } : {}),
        allowedMentions: { parse: [] }
      });
      return;
    }

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
          await interaction.editReply('Your message history is **off** for this server. Shodan does not save your posts as message history unless you opt in with `/privacy history-on`. Use `/privacy history-backfill` separately if you also want older accessible posts imported. Use `/privacy explain` for other stored data.');
          return;
        }
        const backfillText = consent.backfillOptedInAt
          ? 'can be imported when you run `/history-backfill`'
          : 'are not included; use `/privacy history-backfill` to opt in separately';
        await interaction.editReply(`Your message history is **on** for future messages in this server. Shodan has ${history?._count.messages ?? 0} saved message${history?._count.messages === 1 ? '' : 's'} for you. Older posts ${backfillText}. Use \`/privacy history-off\` to stop collection and delete your saved history.`);
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

        await interaction.editReply(`Message history is now **off** for this server. I deleted your message history profile and ${deletedMessages} saved message${deletedMessages === 1 ? '' : 's'}. Your style profile is separate; use \`/style forget\` to delete it.`);
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

      if (action !== 'history-backfill') {
        await interaction.editReply('That privacy option is not recognized. Use `/privacy status` to check your settings.');
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
          ? 'You have already opted in to importing older accessible posts. Run `/history-backfill` to import your posts.'
          : 'You opted in to importing older accessible posts in this server. Run `/history-backfill` to import your posts. Use `/privacy history-off` to revoke both consents and delete your saved history.');
    } catch (error) {
      logger.error('[Privacy] Failed to read or update message history preference:', error);
      await interaction.editReply('I couldn’t update your message history setting. Please try again.');
    }
  }
};

export default privacyCommand;
