import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
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
        .addChoices(
          { name: 'Alloy', value: 'alloy' },
          { name: 'Coral', value: 'coral' },
          { name: 'Nova', value: 'nova' },
          { name: 'Onyx', value: 'onyx' }
        )
    ),
  category: 'fun',
  cooldown: 45,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt', true);
    const voice = interaction.options.getString('voice') ?? 'coral';

    try {
      const ai = getAIService();
      const spokenText = await ai.generateText([
        {
          role: 'system',
          content: 'Write a short spoken line based on the user request. Return only the words to be spoken, with no stage directions, labels, or quotation marks. Keep it under 350 characters.'
        },
        { role: 'user', content: prompt }
      ], { provider: 'openai', guildId: interaction.guildId, max_tokens: 180, dissasociation: 'server' });

      if (!spokenText?.trim()) throw new Error('Luna returned an empty spoken line');
      const audioTitle = await ai.generateText([
        {
          role: 'system',
          content: 'Create a short, funny title for an audio filename that describes the overall situation in the user request, not just the exact spoken line. Use 2 to 5 words. Return only the title, with no quotes, punctuation, or file extension.'
        },
        { role: 'user', content: prompt }
      ], { provider: 'openai', guildId: interaction.guildId, max_tokens: 40, dissasociation: 'server' });

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
