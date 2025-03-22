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