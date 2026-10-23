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

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { backfillUserMessageHistory } from '../../services/message-history';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const historyBackfillCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('history-backfill')
    .setDescription('Import your older accessible posts after opting in.'),
  category: 'utility',
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Message history backfill is available inside a server.',
        ephemeral: true
      });
      return;
    }

    if (interaction.user.bot) {
      await interaction.reply({
        content: 'Bots cannot run a message history backfill.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.editReply('Scanning accessible text and announcement channels for your older posts. This may take a while.');
      const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId);
      const result = await backfillUserMessageHistory(guild, interaction.user.id);

      if (!result.optedIn) {
        await interaction.editReply('You have not opted in to older message imports here. First use `/privacy history-on`, then `/privacy history-backfill` to grant separate backfill consent.');
        return;
      }

      if (result.consentRevoked) {
        await interaction.editReply('The backfill stopped because your consent was revoked. `/privacy history-off` deletes any history saved before it stopped.');
        return;
      }

      const skipped = result.messagesFound - result.messagesSaved;
      const inaccessible = result.inaccessibleChannels
        ? ` I could not read ${result.inaccessibleChannels} channel${result.inaccessibleChannels === 1 ? '' : 's'} because access was unavailable.`
        : '';
      await interaction.editReply(`Backfill complete. I found ${result.messagesFound} of your older posts and saved ${result.messagesSaved} new message${result.messagesSaved === 1 ? '' : 's'}; ${skipped} already-saved duplicate${skipped === 1 ? '' : 's'} were skipped.${inaccessible} Use \`/privacy history-off\` to revoke consent and delete your saved history.`);
    } catch (error) {
      logger.error(`[History Backfill] Failed for user ${interaction.user.id} in guild ${interaction.guildId}:`, error);
      await interaction.editReply('I could not complete your message history backfill. Please try again later.');
    }
  }
};

export default historyBackfillCommand;
