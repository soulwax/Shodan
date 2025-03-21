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