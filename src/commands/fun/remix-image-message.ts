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
  ActionRowBuilder,
  ApplicationCommandType,
  AttachmentBuilder,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getAIService } from '../../services/ai';
import { MessageContextCommand } from '../../types/command';
import { findImageInMessage, MAX_MESSAGE_IMAGE_BYTES } from '../../utils/message-image';
import { logger } from '../../utils/logger';
import { refineImagePrompt } from '../../utils/image-prompt';

export const IMAGE_REMIX_MODAL_PREFIX = 'image-remix:';

const remixImageMessageCommand: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Remix image')
    .setType(ApplicationCommandType.Message),
  category: 'fun',
  cooldown: 60,

  async execute(interaction: MessageContextMenuCommandInteraction) {
    const image = findImageInMessage(interaction.targetMessage);
    if (!image) {
      await interaction.reply({
        content: 'I couldn’t find an image in that post. Choose a post with an attached or embedded image.',
        ephemeral: true
      });
      return;
    }
    if (image.size !== undefined && image.size > MAX_MESSAGE_IMAGE_BYTES) {
      await interaction.reply({ content: 'That image is over 10 MB. Try a smaller one.', ephemeral: true });
      return;
    }

    const promptInput = new TextInputBuilder()
      .setCustomId('prompt')
      .setLabel('How should I change the image?')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);
    const modal = new ModalBuilder()
      .setCustomId(`${IMAGE_REMIX_MODAL_PREFIX}${interaction.targetMessage.id}`)
      .setTitle('Remix image')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput));

    await interaction.showModal(modal);
  }
};

export function isImageRemixModal(customId: string): boolean {
  return customId.startsWith(IMAGE_REMIX_MODAL_PREFIX);
}

export async function handleImageRemixModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const targetMessageId = interaction.customId.slice(IMAGE_REMIX_MODAL_PREFIX.length);
    if (!interaction.channelId) {
      await interaction.editReply('I can’t access that post anymore. Open the message menu again and try once more.');
      return;
    }
    const channel = await interaction.client.channels.fetch(interaction.channelId);
    if (!channel?.isTextBased() || !('messages' in channel)) {
      await interaction.editReply('I can’t access that post anymore. Open the message menu again and try once more.');
      return;
    }

    const targetMessage = await channel.messages.fetch(targetMessageId);
    const image = findImageInMessage(targetMessage);
    if (!image) {
      await interaction.editReply('I couldn’t find an image in that post anymore. Choose a post with an attached or embedded image.');
      return;
    }
    if (image.size !== undefined && image.size > MAX_MESSAGE_IMAGE_BYTES) {
      await interaction.editReply('That image is over 10 MB. Try a smaller one.');
      return;
    }

    const ai = getAIService();
    const prompt = interaction.fields.getTextInputValue('prompt');
    const refinedPrompt = await refineImagePrompt(ai, prompt, true, interaction.guildId);
    const editedImage = await ai.editImage(refinedPrompt, image.url);
    await interaction.editReply({
      files: [new AttachmentBuilder(editedImage, { name: 'remixed-image.png' })]
    });
  } catch (error) {
    logger.error('[Image] Failed to remix a message image:', error);
    await interaction.editReply('I couldn’t edit that image. Check that OpenAI is configured and try again.');
  }
}

export default remixImageMessageCommand;
