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