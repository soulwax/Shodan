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

// File: src/commands/moderation/members.ts



import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const membersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('members')
    .setDescription('Lists members of a given server.'),
  
  category: 'moderation',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }
    
    try {
      await interaction.deferReply();
      const members = await interaction.guild.members.fetch();
      
      // The list might be very long, so we should paginate or limit it
      const memberCount = members.size;
      let memberList = members.map((member) => member.user.tag).join('\n');
      
      // If the list is too long, truncate it
      if (memberList.length > 4000) {
        const displayedMembers = Math.floor(4000 / 20); // Assuming average username length of 20 chars
        memberList = members
          .map((member) => member.user.tag)
          .slice(0, displayedMembers)
          .join('\n');
        memberList += `\n\n... and ${memberCount - displayedMembers} more members`;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name}'s Members (${memberCount})`)
        .setDescription(memberList)
        .setColor('#0099ff')
        .setTimestamp();
        
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching members:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Failed to fetch member list. Make sure I have the necessary permissions.')
        .setColor('#ff0000');
        
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};

export default membersCommand;