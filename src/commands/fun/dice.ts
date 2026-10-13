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
    .setDescription('Roll one or more values from a range you choose.')
    .addIntegerOption((option) =>
      option
        .setName('n')
        .setDescription('How many values should I roll? (1–100)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('min')
        .setDescription('The lowest possible result.')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('max')
        .setDescription('The highest possible result.')
        .setRequired(true)
    )
    .toJSON(),

  category: 'fun',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    let n = interaction.options.getInteger('n')!
    let min = interaction.options.getInteger('min')!
    let max = interaction.options.getInteger('max')!

    // Input validation
    if (n <= 0) {
      await interaction.reply({
        content: 'I need at least one roll. Give it another go?',
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
      [min, max] = [max, min]
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
        .setTitle('🎲 Here’s what came up')
        .setColor('#4D7F9E')
        .setDescription(randoms.join(', '))
        .addFields(
          { name: 'Total', value: sum.toString(), inline: true },
          { name: 'Average roll', value: average.toFixed(2), inline: true },
          { name: 'Roll range', value: `${min}–${max}`, inline: true }
        )
        .setFooter({ text: `Rolled ${n} time${n === 1 ? '' : 's'}` })

      // Use embed for nicer presentation if more than 1 roll
      if (n > 1) {
        await interaction.reply({ embeds: [embed] })
      } else {
        // For single rolls, keep it simple
        await interaction.reply({ content: `🎲 **${randoms[0]}**` })
      }
    } catch (error) {
      console.error('Error in dice command:', error)
      await interaction.reply({
        content: 'The dice got away from me for a moment. Try rolling again?',
        ephemeral: true
      })
    }
  }
}

export default diceCommand
