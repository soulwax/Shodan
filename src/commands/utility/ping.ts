// File: src/commands/utility/ping.ts

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bot latency'),
  
  category: 'utility',
  
  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .setDescription(`⏱️ Latency: ${latency}ms\n💓 API Latency: ${Math.round(interaction.client.ws.ping)}ms`)
      .setColor('#00ffab')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};

export default pingCommand;