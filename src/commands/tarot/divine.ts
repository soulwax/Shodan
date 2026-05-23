// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// File: src/commands/tarot/divine.ts


import { createCanvas, loadImage } from 'canvas'
import crypto from 'crypto'
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import { getOpenAIService } from '../../services/openai'
import { prisma } from '../../services/prisma'
import { Card } from '../../types/card' // Import the Card interface
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

// Define CardData interface before using it
interface CardData {
  nhits: number
  cards: Card[]
}

const divineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('divine')
    .setDescription('Divine a message from the tarot cards.')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('Your divination request.')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('wholesome')
        .setDescription('Whether to give a wholesome reading.')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('seed')
        .setDescription(
          'Seed to recreate a specific reading (format: cardIndex-reversed-temp-wholesome)'
        )
        .setRequired(false)
    ),

  category: 'tarot',
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      await interaction.deferReply()
      logger.info('[Divine] Command triggered')

      const cardDataPath = path.join(
        __dirname,
        '../../../static/card-data.json'
      )
      logger.info(`[Divine] Loading card data from: ${cardDataPath}`)

      const cardDataRaw = fs.readFileSync(cardDataPath, 'utf8')
      const cardData: CardData = JSON.parse(cardDataRaw) // Fix type here

      const question = interaction.options.getString('question')
      const seedParam = interaction.options.getString('seed')
      const maxTokens = 800
      logger.info(`[Divine] Question: ${question}`)
      logger.info(`[Divine] Seed parameter: ${seedParam}`)

      let cardIndex: number,
        isReversed: boolean,
        temperature: number,
        isWholesome: boolean
      if (seedParam) {
        const [seedIndex, seedReversed, seedTemp, seedWholesome] =
          seedParam.split('-')
        cardIndex = parseInt(seedIndex)
        isReversed = seedReversed === '1'
        temperature = parseFloat(seedTemp)
        isWholesome = seedWholesome === '1'
        logger.info('[Divine] Using seed values:', {
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
        logger.info('[Divine] Generated random values:', {
          cardIndex,
          isReversed,
          temperature,
          isWholesome
        })
      }

      const card = cardData.cards[cardIndex]
      logger.info(
        `[Divine] Drew card: ${card.name} ${
          isReversed ? '(reversed)' : '(upright)'
        }`
      )

      // Determine suit code for filename
      const getSuitCode = (card: Card): string => {
        if (card.type === 'major') return 'm'
        if (card.suit === 'cups') return 'c'
        if (card.suit === 'wands') return 'w'
        if (card.suit === 'swords') return 's'
        return 'p' // pentacles
      }

      const suit = getSuitCode(card)

      // Generate filename
      let imageFilename: string
      if (card.type === 'major') {
        const num = card.value_int.toString().padStart(2, '0')
        let name = card.name
          .toLowerCase()
          .replace(/^the\s+/i, '')
          .replace(/\s+last\s+/i, '')
          .replace(/\s+/g, '')

        // Special case for The Hanged Man
        if (name === 'hangedman') {
          name = 'hanged'
        }

        imageFilename = `${suit}_${num}_${name}.jpg`
        logger.info(`[Divine] Generated filename: ${imageFilename}`)
      } else {
        if (['page', 'knight', 'queen', 'king'].includes(card.value || '')) {
          imageFilename = `${suit}_${card.value}.jpg`
        } else if (card.value === 'ace') {
          imageFilename = `${suit}_ace.jpg`
        } else {
          imageFilename = `${suit}_${card.value_int}.jpg`
        }
      }

      const sarcasticPrompt = `you're a tarot reader who's been at this too long and has seen every kind of fool walk through the door. you're not mean, just deeply, deeply tired of everyone's nonsense — including ${interaction.user.username}'s. give a reading that's actually useful but wrapped in enough sarcasm that they'll remember it.

card: ${card.name}${isReversed ? ' — reversed, naturally' : ' — upright, congrats on that at least'}
${question ? `they want to know: "${question}" — sure, let's do this` : "they didn't even ask a question. classic."}

what the card means: ${card.desc}
the traditional read on this: ${isReversed ? card.meaning_rev : card.meaning_up}

keep it under 800 characters. be specific, be a little sharp, sneak in a genuine insight somewhere so it lands. end with something that stings a little but isn't actually cruel. no numbered lists, no bullet points — just talk like a person.`

      const wholesomePrompt = `you're a tarot reader who genuinely cares about the people who come to you. you're warm but not saccharine — you say real things, you notice details, and you make people feel like someone actually listened. give ${interaction.user.username} a reading that means something.

card: ${card.name}${isReversed ? ' (reversed — not a bad thing, just a different angle)' : ' (upright)'}
${question ? `their question: "${question}"` : "they came without a question — sometimes that's where the best readings happen."}

what the card means: ${card.desc}
the traditional read: ${isReversed ? card.meaning_rev : card.meaning_up}

keep it under 800 characters. find the real thing in this card and connect it to them — not in a generic "you have so much potential" way, in a "here's something worth actually sitting with" way. no lists, no headers, just talk.`

      const prompt = isWholesome ? wholesomePrompt : sarcasticPrompt

      logger.info('[Divine] Requesting AI interpretation')
      const openAIService = getOpenAIService()
      const aiInterpretation = await openAIService.createChatCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: 'gpt-4-1106-preview',
          temperature: temperature,
          max_tokens: maxTokens
        }
      )
      logger.info('[Divine] Received AI interpretation')

      try {
        // Get or create user in database
        const user = await prisma.user.upsert({
          where: {
            discordId: interaction.user.id
          },
          update: {
            username: interaction.user.username,
            avatar: interaction.user.avatar || null
          },
          create: {
            discordId: interaction.user.id,
            username: interaction.user.username,
            discriminator: interaction.user.discriminator || null,
            avatar: interaction.user.avatar || null
          }
        })

        // Save the tarot reading to database
        await prisma.tarotReading.create({
          data: {
            userId: user.id,
            cardName: card.name,
            isReversed: isReversed,
            question: question || null,
            interpretation: aiInterpretation || 'No interpretation available',
            seed: `${cardIndex}-${isReversed ? '1' : '0'}-${temperature}-${
              isWholesome ? '1' : '0'
            }`
          }
        })

        logger.info(
          `[Divine] Saved tarot reading to database for user ${interaction.user.username}`
        )
      } catch (dbError) {
        // Log the error but don't interrupt the user experience
        logger.error('[Divine] Failed to save reading to database:', dbError)
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔮 ${card.name}${isReversed ? ' (Reversed)' : ''}`)
        .setColor('#9B59B6')

      const imagePath = path.join(
        __dirname,
        '../../../static/rider-waite',
        imageFilename
      )
      logger.info(`[Divine] Looking for image at: ${imagePath}`)

      if (question) {
        embed.addFields({
          name: 'Your Question',
          value: question,
          inline: false
        })
      }

      const meaning = isReversed ? card.meaning_rev : card.meaning_up
      const splitLongText = (text: string, maxLength = 1024): string[] => {
        if (text.length <= maxLength) return [text]

        const parts: string[] = []
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

      const aiParts = splitLongText(
        aiInterpretation ?? 'No interpretation available'
      )
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
        try {
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

          logger.info('[Divine] Image found, attaching to embed')
          await interaction.editReply({
            embeds: [embed],
            files: [
              {
                attachment: buffer,
                name: imageFilename
              }
            ]
          })
        } catch (err) {
          logger.error('[Divine] Error processing image:', err)
          await interaction.editReply({ embeds: [embed] })
        }
      } else {
        logger.info('[Divine] Image not found, sending embed without image')
        await interaction.editReply({ embeds: [embed] })
      }
    } catch (error) {
      logger.error('[Divine] Error in divine command:', error)
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
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] })
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
        }
      } catch (replyError) {
        logger.error('[Divine] Error sending error message:', replyError)
      }
    }
  }
}

export default divineCommand