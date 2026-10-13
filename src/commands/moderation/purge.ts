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
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js'
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Clear up to 100 recent messages from this channel.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many recent messages should I clear? (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  category: 'moderation',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      // Get the amount of messages to delete
      const amount = interaction.options.getInteger('amount')!

      // Check if we're in a channel
      if (!interaction.channel) {
        await interaction.reply({
          content: 'I can’t access this channel to remove messages.',
          ephemeral: true
        })
        return
      }

      // Check if the channel is a text-based channel that can fetch messages
      if (!interaction.channel.isTextBased()) {
        await interaction.reply({
          content: 'Messages can’t be removed from this kind of channel.',
          ephemeral: true
        })
        return
      }

      // Defer the reply to avoid timeout
      await interaction.deferReply({ ephemeral: true })

      try {
        // Fetch messages to delete
        const messages = await interaction.channel.messages.fetch({
          limit: amount
        })

        // Message deletion logic depends on channel type
        if (interaction.channel.type === ChannelType.DM) {
          // DM channels can only delete bot's own messages
          const botMessages = messages.filter(
            (msg) => msg.author.id === client.user?.id
          )

          for (const message of botMessages.values()) {
            await message.delete()
          }

          await interaction.editReply(
            `Cleared ${botMessages.size} of my messages.`,
          )
        } else if ('bulkDelete' in interaction.channel) {
          // Guild channels can use bulkDelete
          const deleted = await interaction.channel.bulkDelete(messages, true)

          await interaction.editReply(
            `Cleared ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`,
          )
        }
      } catch (error) {
        logger.error('Error during message deletion:', error)

        // Provide more specific error based on common issues
        let errorMessage = 'I couldn’t clear those messages. Please try again.'

        if (error instanceof Error) {
          if (error.message.includes('14 days')) {
            errorMessage =
              'Discord only lets me bulk-delete messages from the last 14 days.'
          } else if (error.message.includes('permission')) {
            errorMessage =
              'I don’t have permission to remove messages in this channel.'
          }
        }

        await interaction.editReply(errorMessage)
      }
    } catch (error) {
      logger.error('Error in purge command:', error)

      if (interaction.deferred) {
        await interaction.editReply(
          'Something went wrong while I was clearing messages. Please try again.'
        )
      } else {
        await interaction.reply({
          content: 'Something went wrong while I was clearing messages. Please try again.',
          ephemeral: true
        })
      }
    }
  }
}

export default purgeCommand
