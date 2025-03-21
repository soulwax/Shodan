const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName(`purge`)
    .setDescription(`Deletes channel messages`)
    .addIntegerOption((option) => {
        return option
          .setName('integer')
          .setDescription('Amount of purged messages0.')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)
      }),
  //this doesn't work yet but doesn't break anything either
  async execute(interaction) {
    const embed = new MessageEmbed()
      .setTitle(`Purging...`)
      .setDescription(`Deletes a certain amount of posts in this channel.`)
      .setColor(`#ab0000`)

    await interaction.reply({ embeds: [embed], ephemeral: true })
  },
}
