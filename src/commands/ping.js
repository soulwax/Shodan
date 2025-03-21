const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName(`ping`)
    .setDescription(`Replies with Pong!`),
  //this doesn't work yet but doesn't break anything either
  async execute(interaction) {
    const ping = Date.now() - interaction.createdTimestamp.valueOf()
    const embed = new MessageEmbed()
      .setTitle(`Pong Motherfucker!`)
      .setDescription(`${ping}ms`)
      .setColor(`#00ffab`)
    await interaction.reply({ embeds: [embed] })
  },
}
