// File: src/commands/members.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('members')
    .setDescription('Lists members of a given server.'),
}
