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