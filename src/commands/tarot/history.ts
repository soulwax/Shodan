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
    .setDescription('Revisit a few of your past tarot readings.')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many readings should I bring back? (1–10, default 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  category: 'tarot',
  cooldown: 10,

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
            'No readings saved yet. Try /divine and your next one will be here.'
        })
        return
      }

      // Notify user that readings are being sent
      await interaction.editReply({
        content: `I’m sending ${readings.length} past reading${readings.length === 1 ? '' : 's'} to your DMs.`
      })

      // Send an initial DM to establish the channel
      const dmChannel = await interaction.user.createDM()
      await dmChannel.send({
        content: `A few moments from your tarot history (${readings.length}):`
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
          .setDescription('A reading from your archive')
          .addFields(
            {
              name: 'When',
              value: `${readingDate} at ${readingTime}`,
              inline: true
            },
            {
              name: 'Reading seed',
              value: reading.seed || 'Unknown',
              inline: true
            }
          )

        // Add question if present
        if (reading.question) {
          embed.addFields({
            name: 'The question you brought',
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
            name: index === 0 ? 'Your reading' : 'Your reading (continued)',
            value: part,
            inline: false
          })
        })

        embed.setFooter({
          text: `Reading ${reading.id} · Use /divine with seed ${reading.seed} to revisit it`
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
            'I couldn’t retrieve your tarot history just now. Please try again in a little while.'
        })
      } else {
        await interaction.reply({
          content:
            'I couldn’t retrieve your tarot history just now. Please try again in a little while.',
          ephemeral: true
        })
      }
    }
  }
}

export default historyCommand
