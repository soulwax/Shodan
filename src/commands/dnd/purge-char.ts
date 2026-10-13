import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const purgeCharacterCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge-char')
    .setDescription('Permanently erase your saved D&D character and its notes from this server.'),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Use this command in the server where your character is stored.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await prisma.dndCharacter.deleteMany({
        where: {
          discordUserId: interaction.user.id,
          campaign: { name: 'Main Campaign', server: { discordId: interaction.guild.id } }
        }
      });
      await interaction.editReply(result.count
        ? 'Your character sheet and remembered notes have been erased from this server. You can begin again with `/character init`.'
        : 'There’s no saved character for you to erase in this server.');
    } catch (error) {
      logger.error('[D&D] Failed to purge character:', error);
      await interaction.editReply('I couldn’t erase your character just now. Please try again.');
    }
  }
};

export default purgeCharacterCommand;
