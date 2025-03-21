// File: src/commands/banned.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banned')
    .setDescription('Lists banned users.')
}
