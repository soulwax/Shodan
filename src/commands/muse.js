const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName(`muse`)
    .setDescription(`Searches over 50 million high quality music files.`),
  //this doesn't work yet but doesn't break anything either
  async execute(interaction) {
    // TODO: Add code to search deezer music library
    await interaction.reply(`Searching music library...`)
  },
}
