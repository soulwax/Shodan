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