import { ApplicationCommandType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction } from 'discord.js';
import { MessageContextCommand } from '../../types/command';
import { logger } from '../../utils/logger';
import { narrationEmbed, narrateImage } from './describe';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imagePattern = /\.(?:apng|avif|bmp|gif|jpe?g|png|webp)(?:\?|$)/i;

function imageFromMessage(interaction: MessageContextMenuCommandInteraction): { url: string; size?: number } | null {
  const message = interaction.targetMessage;
  const attachment = message.attachments.find(item =>
    item.contentType?.startsWith('image/') || imagePattern.test(item.name)
  );
  if (attachment) return { url: attachment.url, size: attachment.size };

  const embedImage = message.embeds.find(embed => embed.image?.url)?.image?.url;
  if (embedImage) return { url: embedImage };

  const linkedImage = message.content.match(/https?:\/\/[^\s<>]+/i)?.[0];
  return linkedImage && imagePattern.test(linkedImage) ? { url: linkedImage } : null;
}

const describeMessageCommand: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Describe image')
    .setType(ApplicationCommandType.Message),
  category: 'fun',
  cooldown: 15,

  async execute(interaction: MessageContextMenuCommandInteraction) {
    const image = imageFromMessage(interaction);
    if (!image) {
      await interaction.reply({
        content: 'I couldn’t find an image in that post. Choose a post with an attached or embedded image.',
        ephemeral: true
      });
      return;
    }
    if (image.size !== undefined && image.size > MAX_IMAGE_BYTES) {
      await interaction.reply({ content: 'That image is over 10 MB. Try a smaller one.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      const narration = await narrateImage(image.url, null);
      await interaction.editReply({ embeds: [narrationEmbed(narration, image.url)] });
    } catch (error) {
      logger.error('[Describe] Failed to narrate a message image:', error);
      await interaction.editReply('I couldn’t get a good look at that just now. Try again in a little bit.');
    }
  }
};

export default describeMessageCommand;
