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
import { DEFAULT_GENERATED_SPEECH_VOICE, GENERATED_SPEECH_VOICES } from '../../data/fun';
import { FUN_PROMPTS } from '../../data/prompts/fun';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

function makeAudioFilename(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

  if (!slug) throw new Error('Luna returned a title that cannot be used as a filename');
  return `${slug}.mp3`;
}

const speakCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Turn a prompt into a short, AI-spoken audio clip.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('What should the generated voice say?')
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption(option =>
      option.setName('voice')
        .setDescription('Choose a generated voice')
        .setRequired(false)
        .addChoices(...GENERATED_SPEECH_VOICES)
    ),
  category: 'fun',
  cooldown: 45,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt', true);
    const voice = interaction.options.getString('voice') ?? DEFAULT_GENERATED_SPEECH_VOICE;

    try {
      const ai = getAIService();
      const spokenText = await ai.generateText([
        {
          role: 'system',
          content: FUN_PROMPTS.speak.spokenLineSystem
        },
        { role: 'user', content: prompt }
      ], { provider: 'openai', guildId: interaction.guildId, max_tokens: 180, disassociation: 'server' });

      if (!spokenText?.trim()) throw new Error('Luna returned an empty spoken line');
      const audioTitle = await ai.generateText([
        {
          role: 'system',
          content: FUN_PROMPTS.speak.audioTitleSystem
        },
        { role: 'user', content: prompt }
      ], { provider: 'openai', guildId: interaction.guildId, max_tokens: 40, disassociation: 'server' });

      if (!audioTitle?.trim()) throw new Error('Luna returned an empty audio filename title');
      const audio = await ai.generateSpeech(spokenText.trim(), voice, interaction.guildId);
      await interaction.editReply({
        files: [new AttachmentBuilder(audio, { name: makeAudioFilename(audioTitle.trim()) })]
      });
    } catch (error) {
      logger.error('[Speak] Failed to generate speech:', error);
      await interaction.editReply('I couldn’t generate that audio. Check that OpenAI is configured and try again.');
    }
  }
};

export default speakCommand;
