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

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { DND_PROMPTS } from '../../data/prompts/dnd'
import { getAIService } from '../../services/ai'
import { campaignChannelScope, getCampaignContext } from '../../services/dnd-campaign'
import { createCampaignStoryEntry, getRecentStory } from '../../services/dnd-context'
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'
import { truncateAtBoundary } from '../../utils/text'

const questCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Get a quest that fits this campaign.')
    .addStringOption((option) =>
      option
        .setName('idea')
        .setDescription('Optional starting point, location, or mood.')
        .setMaxLength(200)
    )
    .addBooleanOption((option) =>
      option
        .setName('save')
        .setDescription('Add the quest to the shared campaign journal.')
    ),
  category: 'dnd',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          'Quests are generated for a server campaign. Use this command in your D&D server.',
        ephemeral: true
      })
      return
    }
    await interaction.deferReply()
    try {
      const channel = interaction.channel
      const campaign = (await getCampaignContext(
        interaction.guild.id,
        interaction.guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      )).campaign
      const story = await getRecentStory(campaign.id, 12)
      const idea =
        interaction.options.getString('idea')?.trim() ||
        DND_PROMPTS.defaults.questIdea
      const result = await getAIService().generateText(
        [
          {
            role: 'system',
            content: DND_PROMPTS.quest.system
          },
          {
            role: 'user',
            content: DND_PROMPTS.quest.user(story, idea)
          }
        ],
        { temperature: 0.85, max_tokens: 420, guildId: interaction.guildId }
      )
      if (!result?.trim()) throw new Error('AI returned an empty quest')
      const quest = result.trim()
      const save = interaction.options.getBoolean('save') === true
      if (save) {
        await createCampaignStoryEntry({
            campaignId: campaign.id,
            discordUserId: interaction.user.id,
            kind: 'QUEST',
            content: quest
        })
      }
      const embed = new EmbedBuilder()
        .setColor(0x8c5b32)
        .setTitle('📜 A new lead for the party')
        .setDescription(truncateAtBoundary(quest, 3900))
        .setFooter({
          text: save
            ? 'Saved to the campaign journal.'
            : 'Use /quest save:true to keep this in the campaign journal.'
        })
      await interaction.editReply({
        embeds: [embed],
        allowedMentions: { parse: [] }
      })
    } catch (error) {
      logger.error('[D&D] Quest generation failed:', error)
      await interaction.editReply(
        'I couldn’t put together a quest right now. Please try again.'
      )
    }
  }
}

export default questCommand
