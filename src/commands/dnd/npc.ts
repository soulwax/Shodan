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

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { DND_PROMPTS } from '../../data/prompts/dnd';
import { getAIService } from '../../services/ai';
import { campaignChannelScope, getCampaignContext } from '../../services/dnd-campaign';
import { createCampaignStoryEntry, getRecentStory } from '../../services/dnd-context';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { truncateAtBoundary } from '../../utils/text';

const npcCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('npc')
    .setDescription('Create a memorable NPC that belongs in this campaign.')
    .addStringOption(option => option.setName('role').setDescription('Optional role, such as ferryman, rival, or innkeeper.').setMaxLength(100))
    .addBooleanOption(option => option.setName('save').setDescription('Add the NPC to the shared campaign journal.')),
  category: 'dnd',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'NPCs are generated for a server campaign. Use this command in your D&D server.', ephemeral: true });
      return;
    }
    await interaction.deferReply();
    try {
      const channel = interaction.channel;
      const campaign = (await getCampaignContext(
        interaction.guild.id,
        interaction.guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      )).campaign;
      const story = await getRecentStory(campaign.id, 12);
      const role = interaction.options.getString('role')?.trim() || DND_PROMPTS.defaults.npcRole;
      const result = await getAIService().generateText([
        {
          role: 'system',
          content: DND_PROMPTS.npc.system
        },
        {
          role: 'user',
          content: DND_PROMPTS.npc.user(story, role)
        }
      ], { temperature: 0.9, max_tokens: 320, guildId: interaction.guildId });
      if (!result?.trim()) throw new Error('AI returned an empty NPC');
      const npc = result.trim();
      const save = interaction.options.getBoolean('save') === true;
      if (save) {
        await createCampaignStoryEntry({
          campaignId: campaign.id,
          discordUserId: interaction.user.id,
          kind: 'NPC',
          content: npc
        });
      }
      const embed = new EmbedBuilder()
        .setColor(0x58726b)
        .setTitle('🎭 Someone new to meet')
        .setDescription(truncateAtBoundary(npc, 3900))
        .setFooter({ text: save ? 'Saved to the campaign journal.' : 'Use /npc save:true to keep this in the campaign journal.' });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.error('[D&D] NPC generation failed:', error);
      await interaction.editReply('I couldn’t dream up an NPC right now. Please try again.');
    }
  }
};

export default npcCommand;
