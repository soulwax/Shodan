// File: src/commands/avatar.js

const { SlashCommandBuilder } = require(`discord.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Embed avatar of a user (prototype).')
    .addMentionableOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose avatar you want to get.')
        .setRequired(true)
    )
}
