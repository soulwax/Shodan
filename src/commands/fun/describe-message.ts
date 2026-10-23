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
