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

// File: src/commands/utility/join.ts


import {
  createAudioPlayer,
  joinVoiceChannel,
  VoiceConnectionStatus
} from '@discordjs/voice'
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  VoiceBasedChannel
} from 'discord.js'
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

const joinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Invite me into your voice channel.'),

  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!(interaction.member instanceof GuildMember)) {
      await interaction.reply({
        content: 'I can only join a voice channel from a server.',
        ephemeral: true
      })
      return
    }

    const voiceChannel = interaction.member.voice
      .channel as VoiceBasedChannel | null

    if (!voiceChannel) {
      const embed = new EmbedBuilder()
        .setTitle('Join me in voice')
        .setDescription('Hop into a voice channel first, and I’ll follow.')
        .setColor('#ff0000')

      await interaction.reply({ embeds: [embed] })
      return
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle('On my way')
        .setDescription(`I’m joining ${voiceChannel.name}.`)
        .setColor('#0099ff')

      await interaction.reply({ embeds: [embed] })

      if (voiceChannel.joinable) {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild!.id,
          adapterCreator: interaction.guild!.voiceAdapterCreator as any
        })

        connection.on(VoiceConnectionStatus.Ready, () => {
          logger.info('Connected to voice channel!')

          const successEmbed = new EmbedBuilder()
            .setTitle('I’m here')
            .setDescription(`Joined ${voiceChannel.name}.`)
            .setColor('#0099ff')

          interaction.followUp({ embeds: [successEmbed] })

          // Create an audio player
          const player = createAudioPlayer()
          connection.subscribe(player)
        })

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
          logger.info('Disconnected from voice channel')

          const disconnectEmbed = new EmbedBuilder()
            .setTitle('Lost connection')
            .setDescription(`I got disconnected from ${voiceChannel.name}.`)
            .setColor('#ff0000')

          await interaction.followUp({ embeds: [disconnectEmbed] })
        })
      } else {
        const embed = new EmbedBuilder()
          .setTitle('I can’t join just yet')
          .setDescription(
            `I don't have permission to join ${voiceChannel.name}.`
          )
          .setColor('#ff0000')

        await interaction.followUp({ embeds: [embed] })
      }
    } catch (error) {
      logger.error('Error joining voice channel:', error)

      const embed = new EmbedBuilder()
          .setTitle('That didn’t work')
        .setDescription(
            'I ran into a problem joining that voice channel. Give it another try in a moment.'
        )
        .setColor('#ff0000')

      await interaction.followUp({ embeds: [embed] })
    }
  }
}

export default joinCommand
