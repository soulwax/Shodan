// File: src/commands/example.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Replies with an example embed.')
}
