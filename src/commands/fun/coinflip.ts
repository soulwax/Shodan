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

// File: src/commands/fun/coinflip.ts


import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { Command } from '../../types/command'
import { coinFlip } from '../../utils/random'

type CoinFlipResult = 'Heads' | 'Tails'

const coinflipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a coin to determine heads or tails.'),

  category: 'fun',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    // First, defer the reply to buy time for the "dramatic effect"
    await interaction.deferReply()

    // The implementation would be migrated from app.js
    const result: CoinFlipResult = coinFlip()

    const embedConfigs = {
      Heads: {
        color: '#FFD700', // Gold
        emoji: '👑',
        description: 'The coin shows...'
      },
      Tails: {
        color: '#C0C0C0', // Silver
        emoji: '🌟',
        description: 'The coin lands on...'
      }
    }

    const config = embedConfigs[result]

    const embed = new EmbedBuilder()
      .setTitle(`${config.emoji} Coin Flip ${config.emoji}`)
      .setDescription(`${config.description}\n\n**${result}!**`)
      .setColor(config.color as any)
      .setTimestamp()

    // Wait a short moment for dramatic effect
    setTimeout(async () => {
      await interaction.editReply({ embeds: [embed] })
    }, 1000)
  }
}

export default coinflipCommand