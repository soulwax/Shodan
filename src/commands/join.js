const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Joins a voice channel.'),
}
