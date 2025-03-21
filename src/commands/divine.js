// File: src/commands/divine.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divine')
    .setDescription('Divine a message.')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('Your divination request.')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('wholesome')
        .setDescription('Whether to give a wholesome reading.')
        .setRequired(false)
     )
    .addStringOption((option) => 
      option
        .setName('seed')
        .setDescription('Seed to recreate a specific reading (format: cardIndex-reversed-temp)')
        .setRequired(false)
    )
}