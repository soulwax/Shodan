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
import { COMPLIMENT_HISTORY_LIMITS } from '../../data/fun';
import { FUN_PROMPTS } from '../../data/prompts/fun';
import { getAIService } from '../../services/ai';
import { lockGuildUserHistory } from '../../services/message-history';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

async function getRecentConsentedPosts(
  guildId: string | null,
  discordUserId: string
): Promise<{ consented: boolean; posts: string[] }> {
  if (!guildId) return { consented: false, posts: [] };

  try {
    return await prisma.$transaction(async transaction => {
      await lockGuildUserHistory(transaction, guildId, discordUserId);
      const consent = await transaction.guildMessageHistoryConsent.findUnique({
        where: { guildId_discordUserId: { guildId, discordUserId } },
        select: { discordUserId: true }
      });
      if (!consent) return { consented: false, posts: [] };

      const history = await transaction.userMessageHistory.findUnique({
        where: { guildId_discordUserId: { guildId, discordUserId } },
        select: {
          messages: {
            orderBy: { createdAt: 'desc' },
          take: COMPLIMENT_HISTORY_LIMITS.databaseHistoryRead,
            select: { content: true }
          }
        }
      });

      return {
        consented: true,
        posts: (history?.messages ?? [])
          .map(message => message.content.trim())
          .filter(Boolean)
          .slice(0, COMPLIMENT_HISTORY_LIMITS.recentPosts)
          .map(content => content.slice(0, COMPLIMENT_HISTORY_LIMITS.postCharacters))
      };
    });
  } catch (error) {
    logger.warn('[Compliment] Could not read consented message history:', error);
    return { consented: false, posts: [] };
  }
}

async function getRecentChannelPosts(
  channel: ChatInputCommandInteraction['channel'],
  discordUserId: string
): Promise<string[]> {
  if (!channel?.isTextBased() || !('messages' in channel)) return [];

  try {
    const messages = await channel.messages.fetch({ limit: COMPLIMENT_HISTORY_LIMITS.channelFetchBatch });
    return [...messages.values()]
      .filter(message => message.author.id === discordUserId && !message.author.bot)
      .sort((left, right) => right.createdTimestamp - left.createdTimestamp)
      .map(message => message.content.trim())
      .filter(Boolean)
      .slice(0, COMPLIMENT_HISTORY_LIMITS.recentPosts)
      .map(content => content.slice(0, COMPLIMENT_HISTORY_LIMITS.postCharacters));
  } catch (error) {
    logger.warn('[Compliment] Could not fetch recent channel posts:', error);
    return [];
  }
}

const complimentCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Compliment yourself or someone else using their posts when they opt in.')
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
        .setMaxLength(200)
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

    const history = await getRecentConsentedPosts(interaction.guildId, targetUser.id);
    let recentPosts = history.posts;
    let postsDescription = 'consented recent posts from this server';
    if (!recentPosts.length && (isSelf || history.consented)) {
      recentPosts = await getRecentChannelPosts(interaction.channel, targetUser.id);
      postsDescription = 'recent posts from the current channel';
    }
    const historyContext = recentPosts.length
      ? FUN_PROMPTS.compliment.history(recentPosts, postsDescription)
      : FUN_PROMPTS.compliment.noHistory;

    const textPrompt = FUN_PROMPTS.compliment.user({
      name: displayName,
      requester: interaction.user.username,
      isSelf,
      topic,
      avatarContext: 'Their avatar is attached; mention something visible only if it gives you a natural, respectful angle.'
    });

    try {
      const ai = getAIService();
      const compliment = await ai.generateText(
        [
          { role: 'system', content: FUN_PROMPTS.compliment.system },
          { role: 'user', content: `${textPrompt}\n\n${historyContext}` }
        ],
        {
          temperature: 0.9,
          max_tokens: 400,
          guildId: interaction.guildId
        },
        avatarUrl
      );

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
