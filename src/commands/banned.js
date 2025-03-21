const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banned')
    .setDescription('Lists banned users.')
}
