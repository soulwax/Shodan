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

import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { refineImagePrompt } from '../../utils/image-prompt';

const imageCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Generate an image, or edit an attached image. Use Apps > Remix image on a post.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Describe the image you want')
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addAttachmentOption(option =>
      option.setName('base_image')
        .setDescription('Optional base image to edit')
        .setRequired(false)
    ),
  category: 'fun',
  cooldown: 60,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt', true);
    const baseImage = interaction.options.getAttachment('base_image');

    if (baseImage && !baseImage.contentType?.startsWith('image/')) {
      await interaction.editReply('That attachment doesn’t look like an image. Choose an image to edit or leave it out to generate a new one.');
      return;
    }
    if (baseImage && baseImage.size > 10 * 1024 * 1024) {
      await interaction.editReply('That base image is over 10 MB. Try a smaller one.');
      return;
    }

    try {
      const ai = getAIService();
      const refinedPrompt = await refineImagePrompt(ai, prompt, Boolean(baseImage), interaction.guildId);
      const image = baseImage
        ? await ai.editImage(refinedPrompt, baseImage.url)
        : await ai.generateImage(refinedPrompt);
      await interaction.editReply({
        files: [new AttachmentBuilder(image, { name: baseImage ? 'edited-image.png' : 'generated-image.png' })]
      });
    } catch (error) {
      logger.error('[Image] Failed to generate image:', error);
      await interaction.editReply('I couldn’t create or edit that image. Check that OpenAI is configured and try again.');
    }
  }
};

export default imageCommand;
