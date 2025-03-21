// File: src/commands/echo.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Echos a message.')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('The message you want to echo.')
        .setRequired(true)
    ),
}
