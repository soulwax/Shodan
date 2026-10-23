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

// File: src/commands/tarot/divine.ts

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import path from 'path';
import { DIVINATION_SPREADS } from '../../data/divination-spreads';
import { loadTarotDeck } from '../../data/tarot-deck';
import { buildDivinationEmbed } from '../../presentation/divination';
import { getAIService } from '../../services/ai';
import { buildDivinationMessages, getReadingLimits } from '../../services/divination-prompts';
import { createDivinationReading, DivinationInputError, parseDivinationRequest } from '../../services/divination-reading';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { createDivinationSpreadImage } from '../../utils/divination-image';

const DIVINATION_CHOICES = DIVINATION_SPREADS.map(spread => ({ name: spread.name, value: spread.id }));

const divineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('divine')
    .setDescription('Draw tarot cards and get a reading to reflect on.')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What would you like the cards to reflect on?')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName('spread')
        .setDescription('Choose a reading layout. Defaults to one card.')
        .addChoices(...DIVINATION_CHOICES)
    )
    .addBooleanOption((option) =>
      option
        .setName('wholesome')
        .setDescription(
          'Choose a gentle reading, or leave this off for dry humor.'
        )
    )
    .addStringOption((option) =>
      option
        .setName('seed')
        .setDescription('Paste a replay seed returned by a previous reading.')
        .setMaxLength(100)
    ),

  category: 'tarot',
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply()
      logger.info('[Divine] Command triggered')

      const cards = loadTarotDeck();
      const request = parseDivinationRequest({
        question: interaction.options.getString('question') ?? '',
        spreadId: interaction.options.getString('spread'),
        seed: interaction.options.getString('seed'),
        wholesome: interaction.options.getBoolean('wholesome')
      }, cards.length);
      const settings = !request.wholesome && interaction.guildId
        ? await prisma.dndServer.findUnique({
            where: { discordId: interaction.guildId },
            select: { divineMeanness: true, divinePersonality: true }
          })
        : null;
      const reading = createDivinationReading(cards, request, settings);
      logger.info(`[Divine] Requesting ${reading.spread.name} interpretation with ${reading.draws.length} cards`);
      const interpretation = await getAIService().generateText(buildDivinationMessages(reading), {
        temperature: reading.temperature,
        max_tokens: getReadingLimits(reading.spread).maxTokens,
        guildId: interaction.guildId,
        preserveExplicitTemperature: true,
        disassociation: 'none'
      });
      if (!interpretation?.trim()) throw new Error('The reading returned no interpretation.');
      const embed = buildDivinationEmbed(reading, interpretation);
      const imageDirectory = path.join(__dirname, '../../../static/rider-waite')
      try {
        const image = await createDivinationSpreadImage(reading.draws, reading.spread, imageDirectory)
        if (image) {
          embed.setImage(`attachment://${image.filename}`)
          await interaction.editReply({
            embeds: [embed],
            files: [{ attachment: image.buffer, name: image.filename }]
          })
        } else {
          await interaction.editReply({ embeds: [embed] })
        }
      } catch (error) {
        logger.error('[Divine] Could not render card images:', error)
        await interaction.editReply({ embeds: [embed] })
      }
    } catch (error) {
      if (error instanceof DivinationInputError) {
        await interaction.editReply(error.message);
        return;
      }
      logger.error('[Divine] Error in divine command:', error)
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔮 The reading didn’t come through')
        .setDescription(
          'I couldn’t finish your reading just now. Please try again in a little while.'
        )
        .setColor('#FF0000')
      try {
        if (interaction.deferred)
          await interaction.editReply({ embeds: [errorEmbed] })
        else await interaction.reply({ embeds: [errorEmbed] })
      } catch (replyError) {
        logger.error('[Divine] Error sending error message:', replyError)
      }
    }
  }
}

export default divineCommand
