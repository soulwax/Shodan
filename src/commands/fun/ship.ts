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

// File: src/commands/fun/ship.ts

import crypto from 'crypto';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  User
} from 'discord.js';
import { getOpenAIService } from '../../services/openai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

// Deterministic score so the same pair always gets the same number
function shipScore(a: User, b: User): number {
  const hash = crypto.createHash('md5').update([a.id, b.id].sort().join(':')).digest('hex');
  return (parseInt(hash.slice(0, 4), 16) % 101); // 0–100
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);
}

const shipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('How compatible are two people, really.')
    .addUserOption((option) =>
      option.setName('first').setDescription('First person').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('second').setDescription('Second person (leave blank to ship with yourself)').setRequired(false)
    ),

  category: 'fun',
  cooldown: 15,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const userA = interaction.options.getUser('first', true);
    const userB = interaction.options.getUser('second') ?? interaction.user;

    if (userA.id === userB.id) {
      await interaction.editReply({ content: 'Shipping someone with themselves. Bold. Consistent. A little concerning.' });
      return;
    }

    const getMember = (u: User): GuildMember | undefined =>
      interaction.guild?.members.cache.get(u.id);

    const memberA = getMember(userA);
    const memberB = getMember(userB);

    const nameA = memberA?.displayName ?? userA.username;
    const nameB = memberB?.displayName ?? userB.username;

    const rolesA = memberA?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'no roles';
    const rolesB = memberB?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'no roles';

    const score = shipScore(userA, userB);
    const bar = scoreBar(score);

    const avatarA = userA.displayAvatarURL({ size: 256, extension: 'png' });
    const avatarB = userB.displayAvatarURL({ size: 256, extension: 'png' });

    // Use the less-fetched avatar as the vision image; mention both in text
    const systemPrompt = `you're the friend who has opinions about everyone's compatibility — not a matchmaker, just someone who pays attention. write two or three sentences about how these two people work together (or don't). be specific to what you know about them. don't editorialize about the score — just talk about the people.

hard rules: no bullet points, no lists. don't open with either person's name. don't say "these two" as an opener. no rom-com language ("sparks fly," "match made in heaven," "opposites attract"). no hedging ("it depends," "who knows"). pick a read and commit to it. write the way a person talks, not the way a bot summarizes.`;

    const textPrompt = `give a quick read on the compatibility between ${nameA} and ${nameB}.
${nameA}: username ${userA.username}, roles: ${rolesA}.
${nameB}: username ${userB.username}, roles: ${rolesB}.
their score came out to ${score}/100 — your commentary should feel consistent with that without spelling it out. ${nameA}'s pfp is attached; ${nameB} is at ${avatarB}.`;

    try {
      const openai = getOpenAIService();
      const commentary = await openai.createVisionCompletion(systemPrompt, textPrompt, avatarA, {
        temperature: 0.95,
        max_tokens: 180
      });

      if (!commentary) throw new Error('Empty response');

      const shipName = nameA.slice(0, Math.ceil(nameA.length / 2)) + nameB.slice(Math.floor(nameB.length / 2));

      const embed = new EmbedBuilder()
        .setColor(score >= 70 ? 0xe91e8c : score >= 40 ? 0xf59e0b : 0x6b7280)
        .setTitle(`💘 ${nameA} + ${nameB}`)
        .setDescription(`**${shipName}** · ${score}/100\n${bar}\n\n${commentary}`)
        .setThumbnail(avatarA)
        .setFooter({ text: `requested by ${interaction.user.username}` });

      logger.info(`[Ship] ${interaction.user.username} shipped ${nameA} with ${nameB} — ${score}/100`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Ship] Failed to generate ship result:', error);
      await interaction.editReply({ content: 'The compatibility engine imploded. Make of that what you will.' });
    }
  }
};

export default shipCommand;
