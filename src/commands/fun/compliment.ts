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

// File: src/commands/fun/compliment.ts

import { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const complimentCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Send someone a little kindness.')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Who could use a kind word? Leave blank for yourself.')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('topic')
        .setDescription('What to compliment them about specifically (optional)')
        .setRequired(false)
    ),

  category: 'fun',
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('target') ?? interaction.user;
    const topic = interaction.options.getString('topic');
    const isSelf = targetUser.id === interaction.user.id;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    const displayName = member?.displayName ?? targetUser.username;
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const topicLine = topic
      ? `focus the compliment specifically on: ${topic}`
      : `compliment something real about them — their presence, their choices, whatever the details give you`;

    const systemPrompt = `Write a warm, personal compliment that sounds like something a thoughtful friend would actually say. Keep it to two or three sentences. Be specific and relaxed, with a little wit if it fits; avoid grand claims, piles of adjectives, or greeting-card language. Don't make assumptions about who someone is from their avatar. No greeting, list, or speech-like opening.`;

    const textPrompt = isSelf
      ? `Say something kind to ${displayName}. They asked for a compliment themselves, which is a nice bit of confidence to play with. ${topicLine}. Their avatar is attached; mention something visible only if it gives you a natural, respectful angle.`
      : `Say something kind to ${displayName}; ${interaction.user.username} wanted to brighten their day. ${topicLine}. Their avatar is attached; mention something visible only if it gives you a natural, respectful angle.`;

    try {
      const ai = getAIService();
      const compliment = await ai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl, {
        temperature: 0.9,
        max_tokens: 200,
        guildId: interaction.guildId
      });

      if (!compliment?.trim()) throw new Error('Empty AI response');

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`💚 ${displayName}`)
        .setDescription(compliment.trim())
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? `${interaction.user.username} knows their worth.`
            : `from ${interaction.user.username}`
        });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Compliment] Failed to generate compliment:', error);
      await interaction.editReply({ content: 'The compliment engine stalled. You deserve better than this.' });
    }
  }
};

export default complimentCommand;
