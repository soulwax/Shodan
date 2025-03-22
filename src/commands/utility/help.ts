// File: src/commands/utility/help.ts



import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../core/client';
import { Command } from '../../types/command';

const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all commands.'),

  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const embed = new EmbedBuilder()
      .setTitle('Help')
      .setDescription('List of all commands:')
      .setColor('#15999f')
      .setAuthor({
        name: client.user?.tag || 'Shodan Bot',
        iconURL: client.user?.displayAvatarURL({ size: 2048 }),
      });

    // Group commands by category
    const commandsByCategory = new Map<string, Command[]>();

    // Add all commands to their categories
    client.commands.forEach(command => {
      const category = command.category || 'Miscellaneous';
      if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
      }
      commandsByCategory.get(category)!.push(command);
    });

    // Add fields for each category
    for (const [category, commands] of commandsByCategory) {
      const commandList = commands
        .map(cmd => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
        .join('\n');

      embed.addFields({
        name: `${category.charAt(0).toUpperCase() + category.slice(1)}`,
        value: commandList,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default helpCommand;