// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const styles = {
  documentary: 'A curious nature documentary narrator: observant, vivid, and gently amused.',
  detective: 'A world-weary detective giving a playful case report, with one sharp observation.',
  dramatic: 'A wildly dramatic movie-trailer narrator. Make the ordinary feel momentous.',
  cozy: 'A friend describing the scene over a warm drink: relaxed, specific, and kind.'
} as const;

export async function narrateImage(imageUrl: string, style: keyof typeof styles | null): Promise<string> {
  const voice = style ? styles[style] : 'A quick-witted friend noticing the details everyone else missed.';
  const systemPrompt = `You are a funny, perceptive person narrating an image for a friend. ${voice}

Write 2–4 natural sentences. Point out concrete things that are actually visible, then add a playful observation or tiny story. Keep it light and conversational, like a message someone would enjoy getting in a group chat. No intro, headings, lists, hashtags, or forced catchphrase. Don't identify people, guess personal traits or emotions, or claim anything about the scene that the image doesn't show.`;
  const textPrompt = 'Give this image a short, entertaining narration. Stick to what you can actually see.';
  const narration = await getAIService().createVisionCompletion(
    systemPrompt,
    textPrompt,
    imageUrl,
    { temperature: 0.95, max_tokens: 220 }
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
        .addChoices(
          { name: 'Nature documentary', value: 'documentary' },
          { name: 'Detective report', value: 'detective' },
          { name: 'Movie trailer', value: 'dramatic' },
          { name: 'Cozy friend', value: 'cozy' }
        )
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
    const style = interaction.options.getString('style') as keyof typeof styles | null;
    try {
      const narration = await narrateImage(image.url, style);
      await interaction.editReply({ embeds: [narrationEmbed(narration, image.url)] });
    } catch (error) {
      logger.error('[Describe] Failed to narrate image:', error);
      await interaction.editReply({ content: 'I couldn’t get a good look at that just now. Try again in a little bit.' });
    }
  }
};

export default describeCommand;
