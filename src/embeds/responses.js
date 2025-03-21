// File: src/embeds/responses.js

const { EmbedBuilder } = require(`discord.js`)
const crypto = require('crypto')

function errNoVoiceChannel() {
  return new EmbedBuilder()
    .setTitle(`Error`)
    .setDescription(`I couldn't find a voice channel.`)
    .setColor(`#ff0000`)
}

function AskToJoinVoiceChannel(voiceChannelName) {
  return new EmbedBuilder()
    .setTitle(`You want me to join a voice channel?`)
    .setDescription(`Let me join ${voiceChannelName}!`)
    .setColor(`#0099ff`)
}

function pong(ping) {
  return new EmbedBuilder()
    .setTitle(`Pong!`)
    .setDescription(`${ping}ms`)
    .setColor(`#00ffab`)
}

function errMentionUser(ping) {
  return new EmbedBuilder()
    .setTitle(`Error`)
    .setDescription(`Please mention a user.`)
    .setColor(`#ff0000`)
}

function showAvatar(userName, userAvatar) {
  return new EmbedBuilder()
    .setTitle(`${userName}'s Avatar`)
    .setDescription(`[Link to avatar](${userAvatar})`)
    .setImage(userAvatar)
    .setColor(`#0099ff`)
}

function echoResponse(description) {
  return new EmbedBuilder()
    .setTitle(`Echo`)
    .setDescription(description)
    .setColor(`#00ff00`)
}

function membersList(guildName, members) {
  return new EmbedBuilder()
    .setTitle(`${guildName}'s Members`)
    .setDescription(members)
    .setColor(`#0099ff`)
}

function bannedList(guildName, members) {
  return new EmbedBuilder()
    .setTitle(`${guildName}'s Bans`)
    .setDescription(members)
    .setColor(`#0099ff`)
}

function noBans(guildName) {
  return new EmbedBuilder()
    .setTitle(`${guildName}'s Bans`)
    .setDescription(`No bans found.`)
    .setColor(`#de1042`)
}

function allCommands(tag, avaURL) {
  return new EmbedBuilder()
    .setTitle(`Help`)
    .setDescription(`List of all commands:`)
    .setColor(`#15999f`)
    .setAuthor({
      name: `${tag}`,
      iconURL: `${avaURL}`,
      url: `${avaURL}`
    })
}

function successJoinVoiceChannel(voiceChannelName) {
  return new EmbedBuilder()
    .setTitle(`Success`)
    .setDescription(`I joined ${voiceChannelName}!`)
    .setColor(`#0099ff`)
}

function errorJoinVoiceChannel(voiceChannelName) {
  return new EmbedBuilder()
    .setTitle(`Error`)
    .setDescription(`I couldn't join ${voiceChannelName}.`)
    .setColor(`#ff0000`)
}

function errAdmin() {
  return new EmbedBuilder()
    .setTitle(`Error`)
    .setDescription(
      `You don't have the permission to do that or the options were not set correctly.`
    )
    .setColor(`#ff0000`)
}

function purge(integer) {
  return new EmbedBuilder()
    .setTitle(`Purging...`)
    .setDescription(`${integer} posts in this channel were purged.`)
    .setColor(`#ab0000`)
}

function getRandom(min, max) {
  // number between min anx max (inclusive)
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function getRandomSecure(min, max) {
  // number between min anx max (inclusive)
  return crypto.randomInt(min, max)
}

function rollDie(numSides) {
  return Math.floor(Math.random() * numSides) + 1 // Adjusted for 1-based dice
}

function rollDieSecure(numSides) {
  return crypto.randomInt(1, numSides) // Adjusted for 1-based dice
}

module.exports = {
  rollDieSecure,
  getRandomSecure,
  rollDie,
  getRandom,
  purge,
  errNoVoiceChannel,
  errAdmin,
  AskToJoinVoiceChannel,
  pong,
  errMentionUser,
  showAvatar,
  echoResponse,
  membersList,
  bannedList,
  noBans,
  allCommands,
  successJoinVoiceChannel,
  errorJoinVoiceChannel
}
