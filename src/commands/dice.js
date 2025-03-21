// File: src/commands/dice.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Gives a random number between min and max')
    .addIntegerOption((option) =>
      option.setName('n').setDescription('amount of dice').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('min').setDescription('lower range').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('max').setDescription('upper range').setRequired(true)
    )
}
