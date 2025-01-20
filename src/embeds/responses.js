// File: src/embeds/responses.js

const { EmbedBuilder } = require(`discord.js`)
const crypto = require('crypto')

const assets = {
  heads: '../../static/coinflip/heads.png',
  tails: '../../static/coinflip/tails.png'
}

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

function coinflipEmbed(result) {
  const embedConfigs = {
    Heads: {
      color: '#FFD700', // Gold
      emoji: '👑',
      description: 'The coin shows...',
      image: assets.heads
    },
    Tails: {
      color: '#C0C0C0', // Silver
      emoji: '🌟',
      description: 'The coin lands on...',
      image: assets.tails
    }
  }

  const config = embedConfigs[result]

  return new EmbedBuilder()
    .setTitle(`${config.emoji} Coin Flip ${config.emoji}`)
    .setDescription(`${config.description}\n\n**${result}!**`)
    .setColor(config.color)
    .setTimestamp()
}

module.exports = {
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
  errorJoinVoiceChannel,
  coinflipEmbed
}
