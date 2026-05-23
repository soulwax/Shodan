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
import { getOpenAIService } from '../../services/openai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const complimentCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Shower a server member with AI-crafted praise')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Who deserves the kind words? (leave blank to compliment yourself)')
        .setRequired(false)
    ),

  category: 'fun',
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('target') ?? interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    const displayName = member?.displayName ?? targetUser.username;
    const roles = member?.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => r.name)
      .join(', ') || 'no roles';
    const joinedDaysAgo = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;
    const accountAgeDays = Math.floor((Date.now() - targetUser.createdAt.getTime()) / 86400000);
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const systemPrompt = `you're a friend who's really good at making people feel seen. write two to four sentences that actually mean something — specific, warm, a bit clever. no generic stuff like "you're so kind and wonderful". use what you know about them: their name, their roles, how long they've been around, their pfp. make it feel like it came from a real person, not a greeting card.`;

    const textPrompt = isSelf
      ? `say something genuinely nice about this person. they go by "${displayName}", username ${targetUser.username}. account is ${accountAgeDays} days old. their roles: ${roles}.${joinedDaysAgo !== null ? ` been on this server ${joinedDaysAgo} days.` : ''} they asked for a compliment themselves — honestly that takes guts, lean into it. their pfp is in the image, if something catches your eye say something about it.`
      : `say something genuinely nice about this person. they go by "${displayName}", username ${targetUser.username}. account is ${accountAgeDays} days old. their roles: ${roles}.${joinedDaysAgo !== null ? ` been on this server ${joinedDaysAgo} days.` : ''} their pfp is in the image, if something catches your eye say something about it. ${interaction.user.username} wanted them to hear something good today.`;

    try {
      const openai = getOpenAIService();
      const compliment = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl);

      if (!compliment) throw new Error('Empty response from OpenAI');

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`💚 Compliment: ${displayName}`)
        .setDescription(compliment)
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? `${interaction.user.username} knows their worth.`
            : `With love from ${interaction.user.username}`
        });

      logger.info(`[Compliment] ${interaction.user.username} complimented ${targetUser.username}`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Compliment] Failed to generate compliment:', error);
      await interaction.editReply({ content: 'The compliment engine stalled. You deserve better than this.' });
    }
  }
};

export default complimentCommand;
