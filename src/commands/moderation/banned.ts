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

// File: src/commands/moderation/banned.ts



import { ChatInputCommandInteraction, Client, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const bannedCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('banned')
    .setDescription('Lists banned users.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  category: 'moderation',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }
    
    try {
      const bans = await interaction.guild.bans.fetch();
      const list = bans.map((ban) => ban.user.tag).join('\n');
      
      if (list.length < 1) {
        const embed = new EmbedBuilder()
          .setTitle(`${interaction.guild.name}'s Bans`)
          .setDescription('No bans found.')
          .setColor('#de1042');
          
        await interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle(`${interaction.guild.name}'s Bans`)
          .setDescription(list)
          .setColor('#0099ff');
          
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error fetching bans:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Failed to fetch ban list. Make sure I have the necessary permissions.')
        .setColor('#ff0000');
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

export default bannedCommand;