// File: src/commands/fun/dice.ts

import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { Command } from '../../types/command'
import { getRandomSecure } from '../../utils/random'

const diceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Generates random numbers between min and max')
    .addIntegerOption((option) =>
      option
        .setName('n')
        .setDescription('Number of random values to generate (1-100)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('min')
        .setDescription('Minimum value (inclusive)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('max')
        .setDescription('Maximum value (inclusive)')
        .setRequired(true)
    )
    .toJSON(),

  category: 'fun',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    let n = interaction.options.getInteger('n')!
    let min = interaction.options.getInteger('min')!
    let max = interaction.options.getInteger('max')!

    // Input validation
    if (n <= 0) {
      await interaction.reply({
        content: 'Number of dice must be at least 1.',
        ephemeral: true
      })
      return
    }

    // Cap at 100 dice to prevent abuse
    if (n > 100) {
      n = 100
    }

    // Ensure min <= max
    if (min > max) {
      // Swap values
      ;[min, max] = [max, min]
    }

    try {
      const randoms: number[] = []
      for (let i = 0; i < n; i++) {
        randoms.push(getRandomSecure(min, max))
      }

      // Calculate statistics
      const sum = randoms.reduce((acc, val) => acc + val, 0)
      const average = sum / randoms.length

      const embed = new EmbedBuilder()
        .setTitle('🎲 Dice Results')
        .setColor('#4D7F9E')
        .setDescription(randoms.join(', '))
        .addFields(
          { name: 'Sum', value: sum.toString(), inline: true },
          { name: 'Average', value: average.toFixed(2), inline: true },
          { name: 'Range', value: `${min} to ${max}`, inline: true }
        )
        .setFooter({ text: `Generated ${n} random values` })

      // Use embed for nicer presentation if more than 1 roll
      if (n > 1) {
        await interaction.reply({ embeds: [embed] })
      } else {
        // For single rolls, keep it simple
        await interaction.reply({ content: randoms[0].toString() })
      }
    } catch (error) {
      console.error('Error in dice command:', error)
      await interaction.reply({
        content: 'An error occurred while generating random numbers.',
        ephemeral: true
      })
    }
  }
}

export default diceCommand
