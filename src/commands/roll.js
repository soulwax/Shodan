// File: src/commands/roll.js

const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll') // Changed to 'roll' for better D&D feel
    .setDescription(
      'Rolls dice in NdX format (e.g., 2d6 for two six-sided dice)'
    )
    .addStringOption((option) =>
      option
        .setName('dice_notation')
        .setDescription('Dice notation (NdX)')
        .setRequired(true)
    )
}
