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
import { getAIService } from '../../services/ai';
import { FUN_PROMPTS } from '../../data/prompts/fun';
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
    .setDescription('See what the group-chat compatibility jury thinks.')
    .addUserOption((option) =>
      option.setName('first').setDescription('First half of the pairing').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('second').setDescription('Second half (leave blank to pair them with you)').setRequired(false)
    ),

  category: 'fun',
  cooldown: 15,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const userA = interaction.options.getUser('first', true);
    const userB = interaction.options.getUser('second') ?? interaction.user;

    if (userA.id === userB.id) {
      await interaction.editReply({ content: 'A self-ship? The jury is intrigued, but this one needs two different people.' });
      return;
    }

    const getMember = (u: User): GuildMember | undefined =>
      interaction.guild?.members.cache.get(u.id);

    const memberA = getMember(userA);
    const memberB = getMember(userB);

    const nameA = memberA?.displayName ?? userA.username;
    const nameB = memberB?.displayName ?? userB.username;

    const rolesA = memberA?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).slice(0, 8).join(', ') || 'no roles';
    const rolesB = memberB?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).slice(0, 8).join(', ') || 'no roles';

    const score = shipScore(userA, userB);
    const bar = scoreBar(score);

    const avatarA = userA.displayAvatarURL({ size: 256, extension: 'png' });

    // Use the less-fetched avatar as the vision image; mention both in text
    const textPrompt = FUN_PROMPTS.ship.user({
      nameA,
      nameB,
      usernameA: userA.username,
      usernameB: userB.username,
      rolesA,
      rolesB,
      score
    });

    try {
      const ai = getAIService();
      const commentary = await ai.generateText(
        [
          { role: 'system', content: FUN_PROMPTS.ship.system },
          { role: 'user', content: textPrompt }
        ],
        {
          temperature: 0.95,
          max_tokens: 180,
          guildId: interaction.guildId
        },
        avatarA
      );

      if (!commentary) throw new Error('Empty response');

      const shipName = nameA.slice(0, Math.ceil(nameA.length / 2)) + nameB.slice(Math.floor(nameB.length / 2));

      const embed = new EmbedBuilder()
        .setColor(score >= 70 ? 0xe91e8c : score >= 40 ? 0xf59e0b : 0x6b7280)
        .setTitle(`💘 ${nameA} + ${nameB}`)
        .setDescription(`**${shipName}** · ${score}/100\n${bar}\n\n${commentary}`)
        .setThumbnail(avatarA)
        .setFooter({ text: `A little matchmaking, courtesy of ${interaction.user.username}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Ship] Failed to generate ship result:', error);
      await interaction.editReply({ content: 'The compatibility jury has gone quiet. Try again in a little bit.' });
    }
  }
};

export default shipCommand;
