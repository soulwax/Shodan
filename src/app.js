// File: src/app.js

require(`dotenv`).config()
const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const TRACKING_CHANNEL_ID = process.env.TRACKING_CHANNEL_ID

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

const fs = require('node:fs')
const path = require('node:path')
const { Routes } = require('discord.js')
const { EmbedBuilder } = require(`discord.js`)
const responseTemplates = require('./embeds')
const setServer = require('./server-setup/setup-server')
const crypto = require('crypto')
const { createCanvas, loadImage } = require('canvas')
const client = setServer.client
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource
} = require('@discordjs/voice')

const OpenAI = require('openai')
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
let globalGreetingsEmbed

const LANGUAGE_CHANNEL_ID = process.env.LANGUAGE_CHANNEL_ID

const commands = []
const commandFiles = fs
  .readdirSync(path.join(__dirname, `commands`))
  .filter((file) => file.endsWith(`.js`))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  commands.push(command.data.toJSON())
}

function splitLongText(text, maxLength = 1024) {
  if (text.length <= maxLength) return [text]

  const parts = []
  let remainingText = text

  while (remainingText.length > maxLength) {
    let splitIndex = remainingText.lastIndexOf('.', maxLength)
    if (splitIndex === -1)
      splitIndex = remainingText.lastIndexOf(' ', maxLength)
    if (splitIndex === -1) splitIndex = maxLength

    parts.push(remainingText.substring(0, splitIndex + 1))
    remainingText = remainingText.substring(splitIndex + 1).trim()
  }

  if (remainingText.length > 0) parts.push(remainingText)
  return parts
}

;(async () => {
  try {
    console.log(`Started refreshing application (/) commands.`)
    setServer.rest
      .put(Routes.applicationCommands(CLIENT_ID), { body: commands })
      .then(
        console.log(`Successfully reloaded application (/) commands. 
        Registered ${commands.length} commands.`)
      )
  } catch (error) {
    console.error(error)
  }
})()

client.on('messageCreate', (message) => {
  console.log(JSON.stringify(message))
})

client.on(`interactionCreate`, async (interaction) => {
  if (!interaction.isCommand()) return
  console.log(interaction.commandName)
  if (interaction.commandName === `ping`) {
    const ping = Date.now() - interaction.createdTimestamp.valueOf()
    const embed = responseTemplates.pong(ping)
    await interaction.reply({ embeds: [embed] })
  }
  if (interaction.commandName === `echo`) {
    const embed = responseTemplates.echoResponse(
      String(interaction.options.getString(`message`))
    )
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === `members`) {
    const guild = interaction.guild
    const members = await guild.members.fetch()
    const memberList = members.map((member) => member.user.tag).join(`\n`)
    const embed = responseTemplates.membersList(guild.name, memberList)
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === `purge`) {
    let isAdmin = false
    let integer
    try {
      const permissions = interaction.member.permissions.bitfield
      isAdmin = interaction.member.permissions.has(`ADMINISTRATOR`)
      integer = interaction.options.getInteger('integer')

      if (!isAdmin || !integer) {
        const embed = responseTemplates.errAdmin()
        await interaction.reply({ embeds: [embed] })
        return
      }
    } catch (error) {
      console.error(error)
      isAdmin = false
      const embed = responseTemplates.errAdmin()
      await interaction.reply({ embeds: [embed], ephemeral: true })
      return
    }

    let messages = await interaction.channel.messages.fetch({ limit: integer })

    await interaction.channel.bulkDelete(messages, true)

    const embed = responseTemplates.purge(integer)
    await interaction.reply({ embeds: [embed], ephemeral: true })
  }

  if (interaction.commandName === `avatar`) {
    const user = interaction.options.getMentionable(`user`)

    const userName = user.user.tag
    const userAvatar = user.displayAvatarURL({ size: 2048 })

    if (!user || !userName || !userAvatar) {
      const embed = responseTemplates.errMentionUser()
      await interaction.reply({ embeds: [embed] })
    } else {
      const embed = responseTemplates.showAvatar(userName, userAvatar)
      await interaction.reply({ embeds: [embed] })
    }
  }

  if (interaction.commandName === `banned`) {
    const guild = interaction.guild
    const bans = await guild.bans.fetch()
    const list = bans.map((ban) => ban.user.tag).join(`\n`)
    if (list.length < 1) {
      const embed = responseTemplates.noBans(guild.name)
      await interaction.reply({ embeds: [embed] })
    } else {
      const embed = responseTemplates.bannedList(guild.name, list)
      await interaction.reply({ embeds: [embed] })
    }
  }

  if (interaction.commandName === 'divine') {
    try {
      await interaction.deferReply()
      console.log('[DEBUG] Divine command triggered')

      const cardDataPath = path.join(__dirname, '../static/card-data.json')
      console.log('[DEBUG] Loading card data from:', cardDataPath)

      const cardData = JSON.parse(fs.readFileSync(cardDataPath, 'utf8'))

      const question = interaction.options.getString('question')
      const seedParam = interaction.options.getString('seed')
      const maxTokens = 800
      console.log('[DEBUG] Question:', question)
      console.log('[DEBUG] Seed parameter:', seedParam)

      let cardIndex, isReversed, temperature, isWholesome
      if (seedParam) {
        const [seedIndex, seedReversed, seedTemp, seedWholesome] =
          seedParam.split('-')
        cardIndex = parseInt(seedIndex)
        isReversed = seedReversed === '1'
        temperature = parseFloat(seedTemp)
        isWholesome = seedWholesome === '1'
        console.log('[DEBUG] Using seed values:', {
          cardIndex,
          isReversed,
          temperature,
          isWholesome
        })
      } else {
        cardIndex = crypto.randomInt(0, cardData.cards.length)
        isReversed = crypto.randomInt(0, 2) === 1
        temperature = 0.7
        isWholesome = interaction.options.getBoolean('wholesome') ?? false
        console.log('[DEBUG] Generated random values:', {
          cardIndex,
          isReversed,
          temperature,
          isWholesome
        })
      }

      const card = cardData.cards[cardIndex]
      console.log(
        '[DEBUG] Drew card:',
        card.name,
        isReversed ? '(reversed)' : '(upright)'
      )

      const sarcasticPrompt = `As a cynical, probably-possessed tarot reader who's seen too much, give an interpretation dripping with sarcasm for:
  
      Card: ${card.name} ${
        isReversed
          ? '(Reversed, because of course it is)'
          : '(Upright, at least something went right)'
      }
      ${
        question
          ? `Question: ${question} (wow, really going for the deep ones here)`
          : "No question? Typical. Let's see what cosmic mess awaits..."
      }
      
      Card Description: ${card.desc}
      Traditional Meaning: ${isReversed ? card.meaning_rev : card.meaning_up}
      
      Your reading should:
      1. Be weirdly specific (unlike ${
        interaction.user.username
      }'s life choices) but also delivered with a tone of absolute patronizing superiority.
      2. Include at least one scathing comparison or metaphor that hits too close to home
      3. Give actual advice, but wrap it in layers of sarcasm
      4. Keep the mystical elements while mocking them simultaneously
      5. Be as subtle as a brick through a window (bonus points for painful truths)
      6. Make it hurt a little less if it's a good card, or a little more if it's a bad one.
      7. The last paragraph should be an encouraging message, but with a twist of cosmic irony.
      8. You are not reddit, remember that. Do not use redditor smugness.
      9. Add unpredictability to your rhetoric but stay close to the card's essence and question asked.
  
      Make it memorable, make it hurt, but keep it under 800 characters - we don't have all day to unpack your cosmic baggage.
      
      Remember: If someone wanted a generic reading, they'd ask their horoscope app. Now let's see what fresh hell the cards have prepared... 🔮`

      const wholesomePrompt = `As a warm, supportive, and genuinely caring tarot reader who sees the best in everyone, offer gentle guidance to ${
        interaction.user.username
      }:

      Card: ${card.name} ${
        isReversed
          ? '(Reversed, but remember - every shadow holds a lesson)'
          : '(Upright, radiating with possibility)'
      }
      ${
        question
          ? `Question: "${question}" (what a thoughtful inquiry, let's explore this together)`
          : 'No question posed - sometimes the most profound answers come from open-hearted reflection.'
      }
      
      Card Description: ${card.desc}
      Traditional Meaning: ${isReversed ? card.meaning_rev : card.meaning_up}
      
      Your reading should:
      1. Highlight ${interaction.user.username}'s inner strength and potential
      2. Include a nurturing metaphor that brings comfort and clarity
      3. Offer practical, encouraging advice that empowers growth
      4. Honor both the mystical wisdom and human experience
      5. Find the silver lining, even in challenging cards
      6. Share a personal observation that shows deep understanding
      7. End with a genuinely uplifting message of hope
      8. Channel the energy of a warm cup of tea shared between dear friends
      
      Keep your guidance concise but heartfelt - 800 characters of pure support and wisdom.
      
      Remember: Every card holds a gift of understanding, and every seeker deserves to be met with compassion. Let's discover what light the cards have to share... ✨`

      const prompt = isWholesome ? wholesomePrompt : sarcasticPrompt

      console.log('[DEBUG] Requesting AI interpretation')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: 800
      })

      const aiInterpretation = completion.choices[0].message.content.trim()
      console.log('[DEBUG] Received AI interpretation')

      const embed = new EmbedBuilder()
        .setTitle(`🔮 ${card.name}${isReversed ? ' (Reversed)' : ''}`)
        .setColor('#9B59B6')

      const suit =
        card.type === 'major'
          ? 'm'
          : card.suit === 'cups'
          ? 'c'
          : card.suit === 'wands'
          ? 'w'
          : card.suit === 'swords'
          ? 's'
          : 'p'

      let imageFilename
      if (card.type === 'major') {
        const num = card.value_int.toString().padStart(2, '0')
        const name = card.name
          .toLowerCase()
          .replace(/^the\s+/i, '')
          .replace(/\s+last\s+/i, '')
          .replace(/\s+/g, '')
        imageFilename = `${suit}_${num}_${name}.jpg`
        console.log('[DEBUG] Generated filename:', imageFilename)
      } else {
        if (['page', 'knight', 'queen', 'king'].includes(card.value)) {
          imageFilename = `${suit}_${card.value}.jpg`
        } else if (card.value === 'ace') {
          imageFilename = `${suit}_ace.jpg`
        } else {
          imageFilename = `${suit}_${card.value_int}.jpg`
        }
      }

      const imagePath = path.join(
        __dirname,
        '../static/rider-waite',
        imageFilename
      )
      console.log('[DEBUG] Looking for image at:', imagePath)

      if (question) {
        embed.addFields({
          name: 'Your Question',
          value: question,
          inline: false
        })
      }

      const meaning = isReversed ? card.meaning_rev : card.meaning_up
      const meaningParts = splitLongText(meaning)
      meaningParts.forEach((part, index) => {
        embed.addFields({
          name:
            index === 0
              ? 'Traditional Meaning'
              : 'Traditional Meaning (continued)',
          value: part,
          inline: false
        })
      })

      const aiParts = splitLongText(aiInterpretation)
      aiParts.forEach((part, index) => {
        embed.addFields({
          name:
            index === 0
              ? 'Personalized Reading'
              : 'Personalized Reading (continued)',
          value: part,
          inline: false
        })
      })

      embed.setFooter({
        text: `The cards offer guidance, but you chart your own path. Trust your intuition.\n\nxSeed: ${cardIndex}-${
          isReversed ? '1' : '0'
        }-${temperature}-${isWholesome ? '1' : '0'}`
      })

      if (fs.existsSync(imagePath)) {
        const img = await loadImage(imagePath)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')

        if (isReversed) {
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate(Math.PI)
          ctx.translate(-canvas.width / 2, -canvas.height / 2)
        }

        ctx.drawImage(img, 0, 0)

        const buffer = canvas.toBuffer('image/jpeg')

        console.log('[DEBUG] Image found, attaching to embed')
        await interaction.editReply({
          embeds: [embed],
          files: [
            {
              attachment: buffer,
              name: imageFilename
            }
          ]
        })
      } else {
        console.log('[DEBUG] Image not found, sending embed without image')
        await interaction.editReply({ embeds: [embed] })
      }
    } catch (error) {
      console.error('[DEBUG] Error in divine command:', error)
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔮 Error')
        .setDescription(
          'The spirits are unclear at this moment. Please try again later.'
        )
        .setColor('#FF0000')
        .addFields({
          name: 'Error Details',
          value: 'There was an issue connecting with the mystical forces.'
        })

      try {
        if (!interaction.deferred) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
        } else {
          await interaction.editReply({ embeds: [errorEmbed] })
        }
      } catch (replyError) {
        console.error('[DEBUG] Error sending error message:', replyError)
      }
    }
  }
  if (interaction.commandName === `dice`) {
    const n = interaction.options.getInteger(`n`)
    const min = interaction.options.getInteger(`min`)
    const max = interaction.options.getInteger(`max`)

    const randoms = []
    for (let i = 0; i < n; i++) {
      randoms.push(responseTemplates.getRandomSecure(min, max))
    }

    const message = randoms.join(`, `)
    await interaction.reply({ content: `${message}` })
  }

  if (interaction.commandName === 'roll') {
    const diceNotation = interaction.options
      .getString('dice_notation')
      .toLowerCase()

    try {
      const match = diceNotation.match(/(\d+)[dw](\d+)/)

      if (!match) {
        throw new Error(
          'Invalid dice notation. Use NdX or NwX format (e.g., 2d6 or 3w8).'
        )
      }

      const numDice = parseInt(match[1], 10)
      const numSides = parseInt(match[2], 10)

      if (numDice < 1 || numSides < 2) {
        throw new Error(
          'Invalid number of dice or sides. Must have at least 1 die and 2 sides.'
        )
      }

      const rolls = []
      for (let i = 0; i < numDice; i++) {
        rolls.push(responseTemplates.rollDieSecure(numSides))
      }

      const message = `You rolled ${diceNotation}: ${rolls.join(
        ', '
      )} (Total: ${rolls.reduce((a, b) => a + b)})`
      await interaction.reply({ content: message })
    } catch (error) {
      await interaction.reply({ content: error.message })
    }
  }

  if (interaction.commandName === `help`) {
    const embed = responseTemplates.allCommands(
      client.user.tag,
      client.user.displayAvatarURL({ size: 2048 })
    )
    for (const command of commands) {
      embed.addFields({
        name: `${command.name}`,
        value: `${command.description}`
      })
    }
    await interaction.reply({ embeds: [embed] })
  }
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return
  if (interaction.commandName === 'nuke') {
    const amount = interaction.options.getInteger('amount')
    const target = interaction.options.getUser('target')
    const channel = interaction.options.getChannel('channel')
    const reason = interaction.options.getString('reason')
    const embed = new EmbedBuilder()
      .setTitle(`Nuke`)
      .setDescription(
        `Nuked ${amount} messages from ${target} in ${channel} for ${reason}`
      )
      .setColor(`#00ff00`)
    await interaction.reply({ embeds: [embed] })
  }
})

client.on(VoiceConnectionStatus.Ready, () => {
  console.log(
    'The connection has entered the Ready state - ready to play audio!'
  )
})

client.on(`interactionCreate`, async (interaction) => {
  if (interaction.commandName === `join`) {
    const voiceChannel = interaction.member.voice.channel
    const embed = responseTemplates.AskToJoinVoiceChannel(voiceChannel.name)
    await interaction.reply({ embeds: [embed] })

    if (!voiceChannel) {
      const embed = responseTemplates.errNoVoiceChannel()
      await interaction.reply({ embeds: [embed] })
    } else {
      if (voiceChannel.joinable) {
        const connection = joinVoiceChannel({
          channelId: interaction.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator
        })
        console.log(connection)

        const player = createAudioPlayer()
        const subscription = connection.subscribe(player)

        const resource = createAudioResource('test.mp3')
        player.play(resource)
        /*await voiceChannel
          .join()
          .then(async (connection) => {
            console.log('connection')
            console.log(connection)
            const embed = responseTemplates.successJoinVoiceChannel(voiceChannel.name)
            await interaction.reply({ embeds: [embed] })
          })
          .catch(async (error) => {
            console.log('error')
            console.log(error)
            const embed = responseTemplates.errorJoinVoiceChannel(voiceChannel.name)
            await interaction.reply({ embeds: [embed] })
          })*/
      }
    }
  }
})

client.on('guildMemberAdd', async (member) => {
  globalGreetingsEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Welcome to the server! Willkommen auf unserem Server!')
    .setDescription(
      'Please select your language: - Bitte wähle deine Sprache aus:'
    )

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('english')
      .setLabel('English')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('german')
      .setLabel('German')
      .setStyle(ButtonStyle.Danger)
  )

  await member.guild.channels.cache.get(LANGUAGE_CHANNEL_ID).send({
    embeds: [globalGreetingsEmbed],
    components: [row],
    ephemeral: true
  })
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return
  const localEmbed = new EmbedBuilder().setColor('#0099ff')

  if (interaction.customId === 'english') {
    const role = interaction.guild.roles.cache.find(
      (role) => role.name === 'EN'
    )
    try {
      cleanupGreeterEmbed(globalGreetingsEmbed, interaction)
      await interaction.member.roles.add(role)
      const name = interaction.member.user.username
      localEmbed.setTitle('Welcome to the server!')
      localEmbed.setDescription(
        `@${name}, you have been verified as an English speaker and assigned the appropriate role.`
      )
      await interaction.reply({ embeds: [localEmbed], ephemeral: true })
    } catch (error) {
      console.log(error)
    } finally {
    }
  }

  if (interaction.customId === 'german') {
    const role = interaction.guild.roles.cache.find(
      (role) => role.name === 'DE'
    )

    try {
      cleanupGreeterEmbed(globalGreetingsEmbed, interaction)
      await interaction.member.roles.add(role)
      const name = interaction.member.user.username
      localEmbed.setTitle('Willkommen auf unserem Server!')
      localEmbed.setDescription(
        `@${name}, du wurdest als Deutschsprachiger verifiziert und der entsprechenden Rolle zugewiesen.`
      )
      await interaction.reply({ embeds: [localEmbed], ephemeral: true })
    } catch (error) {
      console.log(error)
    }
  }
})

const cleanupGreeterEmbed = async (embed, interaction) => {
  await interaction.message.edit({
    components: []
  })
}

client.on(`interactionCreate`, async (interaction) => {
  if (interaction.commandName === `leave`) {
    const voiceChannel = interaction.member.voice.channel
    const embed = responseTemplates.AskToLeaveVoiceChannel(voiceChannel.name)
    await interaction.reply({ embeds: [embed] })

    if (!voiceChannel) {
      const embed = responseTemplates.errNoVoiceChannel()
      await interaction.reply({ embeds: [embed] })
    } else {
      if (voiceChannel.joinable) {
        await voiceChannel
          .leave()
          .then(async (connection) => {
            const embed = responseTemplates.successLeaveVoiceChannel(
              voiceChannel.name
            )
            await interaction.reply({ embeds: [embed] })
          })
          .catch(async (error) => {
            const embed = responseTemplates.errorLeaveVoiceChannel(
              voiceChannel.name
            )
            await interaction.reply({ embeds: [embed] })
          })
      }
    }
  }
})

setServer.tracker.on('guildMemberAdd', (member, type, invite) => {
  console.log('guildMemberAdd')

  const adminGeneral = member.guild.channels.cache.get(TRACKING_CHANNEL_ID)

  const accountAge = Math.floor(
    (Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24)
  )

  let accountAgeString = ''

  if (accountAge > 99) {
    const accountAgeMonths = Math.floor(accountAge / 30)
    const accountAgeDays = Math.floor(accountAge % 30)
    accountAgeString = `${accountAgeMonths} months, ${accountAgeDays} days ago`
  } else {
    accountAgeString = `${accountAge} days ago`
  }

  if (type === 'normal') {
    adminGeneral.send(
      `${member} was invited by: ${invite.inviter.username}! Account created: ${accountAgeString}`
    )
  } else if (type === 'vanity') {
    adminGeneral.send(
      `${member} joined using a custom invite. Account age: ${accountAgeString}`
    )
  } else if (type === 'permissions') {
    adminGeneral.send(
      `I can't figure out how ${member} joined because I don't have the \Manage Server\ permission. Account created: ${accountAgeString}.`
    )
  } else if (type === 'unknown') {
    adminGeneral.send(
      `I can't figure out how ${member} joined the server... Account created: ${accountAgeString}`
    )
  }
})

client.on(`ready`, () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.login(TOKEN)
