import { Message } from 'discord.js';

export const MAX_MESSAGE_IMAGE_BYTES = 10 * 1024 * 1024;

const imagePattern = /\.(?:apng|avif|bmp|gif|jpe?g|png|webp)(?:\?|$)/i;

export type MessageImageSource = {
  url: string;
  size?: number;
};

export function findImageInMessage(message: Message): MessageImageSource | null {
  const attachment = message.attachments.find(item =>
    item.contentType?.startsWith('image/') || imagePattern.test(item.name)
  );
  if (attachment) return { url: attachment.url, size: attachment.size };

  const embedImage = message.embeds.find(embed => embed.image?.url)?.image?.url;
  if (embedImage) return { url: embedImage };

  const linkedImage = message.content.match(/https?:\/\/[^\s<>]+/i)?.[0]?.replace(/[),.!?]+$/, '');
  return linkedImage && imagePattern.test(linkedImage) ? { url: linkedImage } : null;
}
