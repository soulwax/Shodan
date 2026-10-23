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

// File: src/commands/fun/fortune.ts

import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder
} from 'discord.js';
import { getAIService } from '../../services/ai';
import { FUN_PROMPTS } from '../../data/prompts/fun';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const fortuneCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('Get your fortune. Take it or leave it.')
    .addUserOption((option) =>
      option.setName('target').setDescription('Ask for someone else’s fortune (optional)').setRequired(false)
    ),

  category: 'fun',
  cooldown: 20,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('target') ?? interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    const displayName = member?.displayName ?? targetUser.username;
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const textPrompt = FUN_PROMPTS.fortune.user({
      name: displayName,
      requester: interaction.user.username,
      isSelf
    });

    try {
      const ai = getAIService();
      const fortune = await ai.generateText(
        [
          { role: 'system', content: FUN_PROMPTS.fortune.system },
          { role: 'user', content: textPrompt }
        ],
        {
          temperature: 1.0,
          max_tokens: 150,
          guildId: interaction.guildId
        },
        avatarUrl
      );

      if (!fortune?.trim()) throw new Error('Empty AI response');

      const embed = new EmbedBuilder()
        .setColor(0xf4c542)
        .setTitle(`🥠 Fortune for ${displayName}`)
        .setDescription(fortune.trim())
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? 'interpret as you see fit'
            : `delivered by ${interaction.user.username}`
        });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Fortune] Failed to generate fortune:', error);
      await interaction.editReply({ content: 'My crystal ball went a little foggy. Try again in a moment?' });
    }
  }
};

export default fortuneCommand;
