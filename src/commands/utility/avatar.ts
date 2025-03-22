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

// File: src/commands/utility/avatar.ts



import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const avatarCommand: Command = {
  data: <SlashCommandBuilder>new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Embed avatar of a user.')
    .addMentionableOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose avatar you want to get.')
        .setRequired(true)
    ),
  
  category: 'utility',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const user = interaction.options.getMentionable('user');
    
    if (!user || !('user' in user)) {
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please mention a valid user.')
        .setColor('#ff0000');
        
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    const userName = user.user.tag;
    const userAvatar = user.displayAvatarURL({ size: 2048 });
    
    if (!userName || !userAvatar) {
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not retrieve user avatar information.')
        .setColor('#ff0000');
        
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`${userName}'s Avatar`)
      .setDescription(`[Link to avatar](${userAvatar})`)
      .setImage(userAvatar)
      .setColor('#0099ff');
      
    await interaction.reply({ embeds: [embed] });
  }
};

export default avatarCommand;