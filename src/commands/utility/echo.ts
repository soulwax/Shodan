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