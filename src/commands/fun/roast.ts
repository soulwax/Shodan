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
    .setDescription('Roast a server member. Lovingly. Mostly.')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The unfortunate soul to roast (leave blank to roast yourself)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('topic')
        .setDescription('What to roast them about specifically (optional)')
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
    const roles = member?.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => r.name)
      .join(', ') || 'no roles whatsoever';
    const joinedDaysAgo = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;
    const accountAgeDays = Math.floor((Date.now() - targetUser.createdAt.getTime()) / 86400000);
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const topicLine = topic
      ? `focus the roast specifically on: ${topic}`
      : `roast them generally — their choices, their vibe, whatever the pfp gives you`;

    // System prompt engineered to suppress AI-isms and produce natural human-sounding output
    const systemPrompt = `you're the witty one in a friend group — always have the sharp line ready but you're not actually cruel about it. when you roast someone it sounds like a person talking, not a bit. write two or three sentences max.

hard rules: no bullet points, no numbered lists, no em-dashes doing heavy lifting, no "look," "well," "oh," "listen," or "alright" as openers. don't start with their name. don't end with a compliment to soften the blow — that's weak. don't say anything that would get you kicked out of a dinner party. no slurs, no body-shaming, no mental health stuff. just smart, a little mean, funny. write it the way you'd actually say it to their face, not like you're performing it.`;

    const textPrompt = isSelf
      ? `roast this person. they go by "${displayName}", username ${targetUser.username}. account ${accountAgeDays} days old. roles: ${roles}.${joinedDaysAgo !== null ? ` on this server ${joinedDaysAgo} days.` : ''} they asked for this themselves — that's already something. ${topicLine}. pfp is in the image, use it if there's material there.`
      : `roast this person. they go by "${displayName}", username ${targetUser.username}. account ${accountAgeDays} days old. roles: ${roles}.${joinedDaysAgo !== null ? ` on this server ${joinedDaysAgo} days.` : ''} ${interaction.user.username} is the one asking. ${topicLine}. pfp is in the image, use it if there's material there.`;

    try {
      const openai = getOpenAIService();
      const roast = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl, {
        temperature: 1.0,
        max_tokens: 200
      });

      if (!roast) throw new Error('Empty response from OpenAI');

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(`🔥 ${displayName} got cooked`)
        .setDescription(roast)
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? `${interaction.user.username} asked for this. Respect.`
            : `fired by ${interaction.user.username}`
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
