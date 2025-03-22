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

// File: src/commands/utility/echo.ts



import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const echoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Echos a message.')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('The message you want to echo.')
        .setRequired(true)
    )
    .toJSON(),
  
  category: 'utility',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const message = interaction.options.getString('message');
    
    if (!message) {
      await interaction.reply({ content: 'No message provided.', ephemeral: true });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('Echo')
      .setDescription(message)
      .setColor('#00ff00');
      
    await interaction.reply({ embeds: [embed] });
  }
};

export default echoCommand;