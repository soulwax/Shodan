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
