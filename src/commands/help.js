// File: src/commands/help.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all commands.')
}
