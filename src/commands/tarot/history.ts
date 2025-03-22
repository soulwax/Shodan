// File: src/commands/tarot/history.ts

import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { prisma } from '../../services/prisma'
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

const historyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your tarot reading history')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of readings to retrieve (default: 5, max: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  category: 'tarot',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      // Defer reply as ephemeral to acknowledge the command
      await interaction.deferReply({ ephemeral: true })

      // Get requested limit (default to 5)
      const limit = interaction.options.getInteger('limit') || 5

      logger.info(
        `[History] User ${interaction.user.username} requested last ${limit} readings`
      )

      // Get user from database or create if doesn't exist
      const user = await prisma.user.upsert({
        where: {
          discordId: interaction.user.id
        },
        update: {
          username: interaction.user.username,
          avatar: interaction.user.avatar || null
        },
        create: {
          discordId: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator || null,
          avatar: interaction.user.avatar || null
        }
      })

      // Fetch user's reading history
      const readings = await prisma.tarotReading.findMany({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      // Create embeds for each reading
      if (readings.length === 0) {
        await interaction.editReply({
          content:
            "You don't have any tarot readings yet. Try using the `/divine` command first!"
        })
        return
      }

      // Notify user that readings are being sent
      await interaction.editReply({
        content: `I'll send your last ${readings.length} tarot reading(s) to your DMs.`
      })

      // Send an initial DM to establish the channel
      const dmChannel = await interaction.user.createDM()
      await dmChannel.send({
        content: `Here are your last ${readings.length} tarot reading(s):`
      })

      // Send each reading as a separate embed
      for (const reading of readings) {
        const readingDate = reading.createdAt.toLocaleDateString()
        const readingTime = reading.createdAt.toLocaleTimeString()

        const embed = new EmbedBuilder()
          .setTitle(
            `🔮 ${reading.cardName}${reading.isReversed ? ' (Reversed)' : ''}`
          )
          .setColor('#9B59B6')
          .setDescription('Your past tarot reading')
          .addFields(
            {
              name: 'Date',
              value: `${readingDate} at ${readingTime}`,
              inline: true
            },
            {
              name: 'Seed',
              value: reading.seed || 'Unknown',
              inline: true
            }
          )

        // Add question if present
        if (reading.question) {
          embed.addFields({
            name: 'Your Question',
            value: reading.question,
            inline: false
          })
        }

        // Split interpretation if necessary (Discord has a 1024 character limit per field)
        const splitLongText = (text: string, maxLength = 1024): string[] => {
          if (text.length <= maxLength) return [text]

          const parts: string[] = []
          let remainingText = text

          while (remainingText.length > maxLength) {
            let splitIndex = remainingText.lastIndexOf('.', maxLength)
            if (splitIndex === -1)
              splitIndex = remainingText.lastIndexOf(' ', maxLength)
            if (splitIndex === -1) splitIndex = maxLength

            parts.push(remainingText.substring(0, splitIndex + 1))
            remainingText = remainingText.substring(splitIndex + 1).trim()
          }

          if (remainingText.length > 0) parts.push(remainingText)
          return parts
        }

        const interpretationParts = splitLongText(reading.interpretation)
        interpretationParts.forEach((part, index) => {
          embed.addFields({
            name: index === 0 ? 'Interpretation' : 'Interpretation (continued)',
            value: part,
            inline: false
          })
        })

        embed.setFooter({
          text: `Reading ID: ${reading.id} • Use /divine with seed: ${reading.seed} to revisit this reading`
        })

        // Send this reading's embed
        await dmChannel.send({ embeds: [embed] })

        // Add a small delay between messages to avoid rate limits
        if (readings.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      logger.info(
        `[History] Sent ${readings.length} readings to ${interaction.user.username}`
      )
    } catch (error) {
      logger.error('[History] Error retrieving reading history:', error)

      // Handle error
      if (interaction.deferred) {
        await interaction.editReply({
          content:
            'There was an error retrieving your tarot reading history. Please try again later.'
        })
      } else {
        await interaction.reply({
          content:
            'There was an error retrieving your tarot reading history. Please try again later.',
          ephemeral: true
        })
      }
    }
  }
}

export default historyCommand
