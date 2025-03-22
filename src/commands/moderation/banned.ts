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