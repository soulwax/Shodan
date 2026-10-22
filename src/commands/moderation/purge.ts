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

// File: src/commands/moderation/purge.ts

import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js'
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

const BULK_DELETE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete up to 100 recent messages from this channel.')
    .addIntegerOption(option => option
      .setName('amount')
      .setDescription('How many recent messages should I delete? (1–100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  category: 'moderation',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const amount = interaction.options.getInteger('amount', true)
      const channel = interaction.channel

      if (!interaction.inGuild() || !interaction.guild) {
        await interaction.reply({
          content: 'Use `/purge` in a server channel.',
          ephemeral: true
        })
        return
      }

      if (!channel?.isTextBased() || !('messages' in channel) || !('bulkDelete' in channel)) {
        await interaction.reply({
          content: 'I can’t remove messages from this kind of channel.',
          ephemeral: true
        })
        return
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({
          content: 'You need Manage Messages permission to use `/purge`.',
          ephemeral: true
        })
        return
      }

      const requiredBotPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
      if (requiredBotPermissions.some(permission => !interaction.appPermissions.has(permission))) {
        await interaction.reply({
          content: 'I need View Channel, Read Message History, and Manage Messages permissions here to use `/purge`.',
          ephemeral: true
        })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      const messages = await channel.messages.fetch({ limit: amount })
      const cutoff = Date.now() - BULK_DELETE_MAX_AGE_MS
      const recentMessages = messages.filter(message => message.createdTimestamp > cutoff)
      const tooOldCount = messages.size - recentMessages.size

      let deletedCount = 0
      if (recentMessages.size === 1) {
        await recentMessages.first()!.delete()
        deletedCount = 1
      } else if (recentMessages.size > 1) {
        // Keep each invocation to one bulk request instead of a burst of deletes.
        deletedCount = (await channel.bulkDelete(recentMessages)).size
      }

      const lines = [`Removed ${deletedCount} of ${amount} requested message${amount === 1 ? '' : 's'}.`]
      if (messages.size < amount) {
        lines.push(`Only ${messages.size} message${messages.size === 1 ? ' was' : 's were'} found in the channel.`)
      }
      if (tooOldCount > 0) {
        lines.push(`Left ${tooOldCount} message${tooOldCount === 1 ? '' : 's'} older than 14 days untouched; Discord does not allow those in a bulk delete.`)
      }
      await interaction.editReply(lines.join('\n'))
    } catch (error) {
      logger.error('Error in purge command:', error)
      const message = 'I couldn’t finish removing those messages. Check my channel permissions and try again.'

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message)
      } else {
        await interaction.reply({ content: message, ephemeral: true })
      }
    }
  }
}

export default purgeCommand
