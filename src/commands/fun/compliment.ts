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
    .setDescription('Say something genuinely nice to someone for once.')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Who deserves the kind words? (leave blank to compliment yourself)')
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
    const roles = member?.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => r.name)
      .join(', ') || 'no roles';
    const joinedDaysAgo = member?.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;
    const accountAgeDays = Math.floor((Date.now() - targetUser.createdAt.getTime()) / 86400000);
    const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });

    const topicLine = topic
      ? `focus the compliment specifically on: ${topic}`
      : `compliment something real about them — their presence, their choices, whatever the details give you`;

    // System prompt engineered to suppress AI-isms and produce natural human-sounding warmth
    const systemPrompt = `you're the person in the group who actually notices things about people and says so. when you give someone a compliment it doesn't feel like a form letter — it lands because it's specific. write two or three sentences, no more.

hard rules: no bullet points, no lists, no em-dashes doing heavy lifting. don't start with "you are" or their name. don't open with "i" either. no filler like "truly," "honestly," "genuinely," "absolutely," "amazing," "incredible," or "wonderful." no greeting-card energy. don't be sappy. be warm the way a real person is warm — with a little wit, a little edge, not drowning in adjectives. write it like you'd actually say it, not like you're writing a speech.`;

    const textPrompt = isSelf
      ? `say something genuinely nice about this person. they go by "${displayName}", username ${targetUser.username}. account ${accountAgeDays} days old. roles: ${roles}.${joinedDaysAgo !== null ? ` on this server ${joinedDaysAgo} days.` : ''} they asked for a compliment themselves — that takes a specific kind of confidence, work with it. ${topicLine}. pfp is in the image, if something catches your eye use it.`
      : `say something genuinely nice about this person. they go by "${displayName}", username ${targetUser.username}. account ${accountAgeDays} days old. roles: ${roles}.${joinedDaysAgo !== null ? ` on this server ${joinedDaysAgo} days.` : ''} ${interaction.user.username} wanted them to hear something good today. ${topicLine}. pfp is in the image, if something catches your eye use it.`;

    try {
      const openai = getOpenAIService();
      const compliment = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarUrl, {
        temperature: 0.9,
        max_tokens: 200
      });

      if (!compliment) throw new Error('Empty response from OpenAI');

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`💚 ${displayName}`)
        .setDescription(compliment)
        .setThumbnail(avatarUrl)
        .setFooter({
          text: isSelf
            ? `${interaction.user.username} knows their worth.`
            : `from ${interaction.user.username}`
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
