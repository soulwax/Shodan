import { ApplicationCommandType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction } from 'discord.js';
import { MessageContextCommand } from '../../types/command';
import { logger } from '../../utils/logger';
import { findImageInMessage, MAX_MESSAGE_IMAGE_BYTES } from '../../utils/message-image';
import { narrationEmbed, narrateImage } from './describe';

const describeMessageCommand: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Describe image')
    .setType(ApplicationCommandType.Message),
  category: 'fun',
  cooldown: 15,

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

    await interaction.deferReply();
    try {
      const narration = await narrateImage(image.url, null, interaction.guildId);
      await interaction.editReply({ embeds: [narrationEmbed(narration, image.url)] });
    } catch (error) {
      logger.error('[Describe] Failed to narrate a message image:', error);
      await interaction.editReply('I couldn’t get a good look at that just now. Try again in a little bit.');
    }
  }
};

export default describeMessageCommand;
