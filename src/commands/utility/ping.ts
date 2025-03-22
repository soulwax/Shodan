// File: src/commands/utility/ping.ts


import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { Command } from '../../types/command'

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bot latency'),

  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const sent = await interaction.deferReply({ fetchReply: true })
    const latency = sent.createdTimestamp - interaction.createdTimestamp

    const germanGreetings = [
      'Grüße aus Deutschland! / Greetings from Germany!',
      'Hallo vom deutschen Server! / Hello from the German server!',
      'Guten Tag von Soulwax aus Deutschland! / Good day from Soulwax in Germany!',
      'Servus vom deutschen Team! / Howdy from the German team!',
      'Grüße aus dem Herzen Europas! / Greetings from the heart of Europe!'
    ]

    // Get a random greeting
    const greeting =
      germanGreetings[Math.floor(Math.random() * germanGreetings.length)]

    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .setDescription(
        `⏱️ Latency: ${latency}ms\n💓 API Latency: ${Math.round(
          client.ws.ping
        )}ms\n\n${greeting}`
      )
      .setColor('#00ffab')
      .setTimestamp()
      .setThumbnail(
        'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/1200px-Flag_of_Germany.svg.png'
      )
      // You can also use the image property for a larger flag display
      .setImage(
        'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/1200px-Flag_of_Germany.svg.png'
      )

    await interaction.editReply({ embeds: [embed] })
  }
}

export default pingCommand