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

// File: src/commands/utility/example.ts



import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const exampleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Replies with an example embed.'),
  
  category: 'utility',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const embed = new EmbedBuilder()
      .setTitle('Example Embed')
      .setDescription('This is an example of an embed message.')
      .setColor('#00ff00')
      .addFields(
        { name: 'Field 1', value: 'This is a field value', inline: true },
        { name: 'Field 2', value: 'This is another field value', inline: true },
        { name: 'Field 3', value: 'This is a non-inline field', inline: false }
      )
      .setFooter({ text: 'Footer text here' })
      .setTimestamp();
      
    await interaction.reply({ embeds: [embed] });
  }
};

export default exampleCommand;