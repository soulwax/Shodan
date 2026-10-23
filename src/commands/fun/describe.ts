// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { DEFAULT_IMAGE_NARRATION_VOICE, IMAGE_NARRATION_STYLES, ImageNarrationStyle } from '../../data/fun';
import { FUN_PROMPTS } from '../../data/prompts/fun';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

export async function narrateImage(imageUrl: string, style: ImageNarrationStyle | null, guildId?: string | null): Promise<string> {
  const voice = IMAGE_NARRATION_STYLES.find(item => item.value === style)?.voice ?? DEFAULT_IMAGE_NARRATION_VOICE;
  const narration = await getAIService().generateText(
    [
      { role: 'system', content: FUN_PROMPTS.describeImage.system(voice) },
      { role: 'user', content: FUN_PROMPTS.describeImage.user }
    ],
    { temperature: 0.95, max_tokens: 220, guildId },
    imageUrl
  );
  if (!narration?.trim()) throw new Error('Empty AI response');
  return narration.trim();
}

export function narrationEmbed(narration: string, imageUrl: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(narration)
    .setImage(imageUrl)
    .setFooter({ text: 'A little narration for the group.' });
}

const describeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('describe')
    .setDescription('Narrate an uploaded image, or use the message Apps menu on a post.')
    .addAttachmentOption(option =>
      option.setName('image').setDescription('The image to narrate').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Pick the voice for the narration')
        .setRequired(false)
        .addChoices(...IMAGE_NARRATION_STYLES.map(({ name, value }) => ({ name, value })))
    ),
  category: 'fun',
  cooldown: 15,

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    await interaction.deferReply();
    const image = interaction.options.getAttachment('image', true);
    if (!image.contentType?.startsWith('image/')) {
      await interaction.editReply({ content: 'That doesn’t look like an image I can narrate. Try attaching a photo instead.' });
      return;
    }
    if (image.size > 10 * 1024 * 1024) {
      await interaction.editReply({ content: 'That image is a bit too large for me to take in. Try one under 10 MB.' });
      return;
    }
    const style = interaction.options.getString('style') as ImageNarrationStyle | null;
    try {
      const narration = await narrateImage(image.url, style, interaction.guildId);
      await interaction.editReply({ embeds: [narrationEmbed(narration, image.url)] });
    } catch (error) {
      logger.error('[Describe] Failed to narrate image:', error);
      await interaction.editReply({ content: 'I couldn’t get a good look at that just now. Try again in a little bit.' });
    }
  }
};

export default describeCommand;
