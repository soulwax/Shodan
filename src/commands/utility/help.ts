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