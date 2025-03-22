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
    .setDescription('Deletes the specified number of recent messages')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      // Get the amount of messages to delete
      const amount = interaction.options.getInteger('amount')!

      // Check if we're in a channel
      if (!interaction.channel) {
        await interaction.reply({
          content: 'Cannot access this channel for message deletion.',
          ephemeral: true
        })
        return
      }

      // Check if the channel is a text-based channel that can fetch messages
      if (!interaction.channel.isTextBased()) {
        await interaction.reply({
          content: 'This channel does not support message deletion.',
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
            `Deleted ${botMessages.size} of my messages.`
          )
        } else if ('bulkDelete' in interaction.channel) {
          // Guild channels can use bulkDelete
          const deleted = await interaction.channel.bulkDelete(messages, true)

          await interaction.editReply(
            `Successfully deleted ${deleted.size} messages.`
          )
        }
      } catch (error) {
        logger.error('Error during message deletion:', error)

        // Provide more specific error based on common issues
        let errorMessage = 'Failed to delete messages.'

        if (error instanceof Error) {
          if (error.message.includes('14 days')) {
            errorMessage =
              'Discord only allows bulk deletion of messages that are under 14 days old.'
          } else if (error.message.includes('permission')) {
            errorMessage =
              "I don't have permission to delete messages in this channel."
          }
        }

        await interaction.editReply(errorMessage)
      }
    } catch (error) {
      logger.error('Error in purge command:', error)

      if (interaction.deferred) {
        await interaction.editReply(
          'An error occurred while trying to purge messages.'
        )
      } else {
        await interaction.reply({
          content: 'An error occurred while trying to purge messages.',
          ephemeral: true
        })
      }
    }
  }
}

export default purgeCommand