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

// File: src/commands/fun/roast.ts

import { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';
import { getOpenAIService } from '../../services/openai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const roastCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a server member with AI-powered savagery')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The unfortunate soul to roast (leave blank to roast yourself)')
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
      .join(', ') || 'no roles whatsoever';
    const joinedDaysAgo = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;
    const accountAgeDays = Math.floor((Date.now() - targetUser.createdAt.getTime()) / 86400000);
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const systemPrompt = `you're a roast comedian at a comedy club. keep it short — two to four sentences, max. be funny and a little mean but don't go after anything genuinely hurtful. no slurs, no body-shaming, keep it the kind of thing you'd say to someone's face at a party and they'd laugh. use whatever you know about them — their name, their roles, how long they've been around, their pfp.`;

    const textPrompt = isSelf
      ? `roast this person. they go by "${displayName}" on discord, username ${targetUser.username}. their account is ${accountAgeDays} days old. their roles are: ${roles}.${joinedDaysAgo !== null ? ` they've been on this server for ${joinedDaysAgo} days.` : ''} here's the kicker — they asked for this themselves. that's fair game. their profile pic is in the image, use it if there's something there.`
      : `roast this person. they go by "${displayName}" on discord, username ${targetUser.username}. their account is ${accountAgeDays} days old. their roles are: ${roles}.${joinedDaysAgo !== null ? ` they've been on this server for ${joinedDaysAgo} days.` : ''} their profile pic is in the image, use it if there's something there. ${interaction.user.username} is the one asking for this, not them.`;

    try {
      const openai = getOpenAIService();
      const roast = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl);

      if (!roast) throw new Error('Empty response from OpenAI');

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(`🔥 Roast: ${displayName}`)
        .setDescription(roast)
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? `${interaction.user.username} asked for this. Respect.`
            : `Requested by ${interaction.user.username}`
        });

      logger.info(`[Roast] ${interaction.user.username} roasted ${targetUser.username}`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Roast] Failed to generate roast:', error);
      await interaction.editReply({ content: 'The roast machine is temporarily offline. Even it needs a break.' });
    }
  }
};

export default roastCommand;
