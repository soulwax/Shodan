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
import { getOpenAIService } from '../../services/openai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const fortuneCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('Get your fortune. Take it or leave it.')
    .addUserOption((option) =>
      option.setName('target').setDescription('Get a fortune for someone else (optional)').setRequired(false)
    ),

  category: 'fun',
  cooldown: 20,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('target') ?? interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    const displayName = member?.displayName ?? targetUser.username;
    const roles = member?.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .join(', ') || 'none';
    const joinedDaysAgo = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const systemPrompt = `you write fortunes. not fortune-cookie clichés — actual ones. the kind that feel vaguely specific, like you know something. one to three sentences. they should land somewhere between a little wise and a little unsettling, like something a clever stranger said once that you never forgot.

hard rules: no bullet points, no lists. don't address the person by name inside the fortune itself — write it to them, not about them. don't start with "you will" or "soon" or "the stars." no vague filler like "great things await" or "trust the journey." no rhyming. no fake mysticism with words like "cosmos," "universe," "fate," "destiny," or "path." be weird and specific in a way that feels earned, not random. write it like a human wrote it, not like a horoscope generator.`;

    const textPrompt = `write a fortune for ${displayName} (username: ${targetUser.username}).${joinedDaysAgo !== null ? ` they've been around for ${joinedDaysAgo} days.` : ''} their roles: ${roles}. their pfp is attached — if something in it gives you an angle, use it.${!isSelf ? ` ${interaction.user.username} is asking on their behalf.` : ''}`;

    try {
      const openai = getOpenAIService();
      const fortune = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl, {
        temperature: 1.0,
        max_tokens: 150
      });

      if (!fortune) throw new Error('Empty response');

      const embed = new EmbedBuilder()
        .setColor(0xf4c542)
        .setTitle(`🥠 Fortune for ${displayName}`)
        .setDescription(`*${fortune}*`)
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? 'interpret as you see fit'
            : `delivered by ${interaction.user.username}`
        });

      logger.info(`[Fortune] Generated fortune for ${targetUser.username}`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Fortune] Failed to generate fortune:', error);
      await interaction.editReply({ content: "The fortune cookie is empty. That's probably meaningful." });
    }
  }
};

export default fortuneCommand;
