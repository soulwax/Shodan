import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAIService } from '../../services/ai';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const imageCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Generate an image from a prompt.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Describe the image you want')
        .setRequired(true)
        .setMaxLength(1000)
    ),
  category: 'fun',
  cooldown: 60,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt', true);

    try {
      const ai = getAIService();
      const refinedPrompt = await ai.createOpenAICompletion([
        {
          role: 'system',
          content: 'Turn the user request into one concise, vivid prompt for an image-generation model. Preserve the requested subject and intent, add useful visual composition and style details, and do not add text or lettering unless the user asks for it. Return only the image prompt.'
        },
        { role: 'user', content: prompt }
      ], { guildId: interaction.guildId, max_tokens: 400 });

      if (!refinedPrompt?.trim()) throw new Error('Luna returned an empty image prompt');
      const image = await ai.generateImage(refinedPrompt.trim());
      await interaction.editReply({
        files: [new AttachmentBuilder(image, { name: 'generated-image.png' })]
      });
    } catch (error) {
      logger.error('[Image] Failed to generate image:', error);
      await interaction.editReply('I couldn’t generate that image. Check that OpenAI is configured and try again.');
    }
  }
};

export default imageCommand;
