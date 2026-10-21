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
import { getAIService } from '../../services/ai'
import { prisma } from '../../services/prisma'
import { Card } from '../../types/card' // Import the Card interface
import { Command } from '../../types/command'
import { logger } from '../../utils/logger'

// Define CardData interface before using it
interface CardData {
  nhits: number
  cards: Card[]
}

const DEFAULT_DIVINE_MEANNESS = 2

function meannessInstruction(level: number): string {
  const instructions: Record<number, string> = {
    1: 'Keep the teasing very gentle and affectionate, with only the lightest dry humor.',
    2: 'Use dry, friendly humor with a little teasing, while clearly staying on the person’s side.',
    3: 'Make the wit sharper and the teasing more noticeable, but keep it playful and useful.',
    4: 'Use spicy, pointed banter and a stronger comic bite, while remaining supportive rather than cruel.',
    5: 'Deliver a scathing, theatrical roast of the situation and the choices explicitly described in the question. Make the wit ruthless and punchy, but keep it clearly comedic; do not invent personal details or attack the person’s identity, appearance, vulnerabilities, or worth. Make them feel miserable but add a slight wink of encouragement.'
  }
  return instructions[level] ?? instructions[DEFAULT_DIVINE_MEANNESS]
}

const divineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('divine')
    .setDescription('Draw a tarot card and get a reading to sit with.')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What would you like the cards to reflect on?')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('wholesome')
        .setDescription('Choose a gentle reading, or leave this off for dry humor.')
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
      logger.info(`[Divine] Seed parameter: ${seedParam}`)

      let cardIndex: number,
        isReversed: boolean,
        temperature: number,
        isWholesome: boolean,
        meanness: number
      let meannessIsSeeded = false
      if (seedParam) {
        const [seedIndex, seedReversed, seedTemp, seedWholesome, seedMeanness] =
          seedParam.split('-')
        cardIndex = parseInt(seedIndex)
        isReversed = seedReversed === '1'
        temperature = parseFloat(seedTemp)
        isWholesome = seedWholesome === '1'
        const seededMeanness = Number.parseInt(seedMeanness, 10)
        meanness = Number.isInteger(seededMeanness) && seededMeanness >= 1 && seededMeanness <= 5
          ? seededMeanness
          : DEFAULT_DIVINE_MEANNESS
        meannessIsSeeded = Number.isInteger(seededMeanness) && seededMeanness >= 1 && seededMeanness <= 5
        logger.info('[Divine] Using seed values:', {
          cardIndex,
          isReversed,
          temperature,
          isWholesome,
          meanness
        })
      } else {
        cardIndex = crypto.randomInt(0, cardData.cards.length)
        isReversed = crypto.randomInt(0, 2) === 1
        temperature = 0.7
        isWholesome = interaction.options.getBoolean('wholesome') ?? false
        meanness = DEFAULT_DIVINE_MEANNESS
        logger.info('[Divine] Generated random values:', {
          cardIndex,
          isReversed,
          temperature,
          isWholesome,
          meanness
        })
      }

      if (!isWholesome && interaction.guildId && !meannessIsSeeded) {
        const settings = await prisma.dndServer.findUnique({
          where: { discordId: interaction.guildId },
          select: { divineMeanness: true }
        })
        meanness = settings?.divineMeanness ?? meanness
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

      const readingContext = `Card: ${card.name}${isReversed ? ' (reversed)' : ' (upright)'}.
${question ? `Their question: "${question}"` : 'They came without a particular question.'}
Card details: ${card.desc}
Traditional meaning: ${isReversed ? card.meaning_rev : card.meaning_up}`

      const sarcasticPrompt = `Give a tarot reading in the voice of a dry, funny friend. ${meannessInstruction(meanness)} Make the card feel relevant without pretending to know their private life or predict the future. Never target appearance, identity, health, trauma, or other sensitive traits. Keep it conversational, useful, and under 800 characters. No lists or headings.

${readingContext}`

      const wholesomePrompt = `Give a thoughtful tarot reading in the voice of a kind, perceptive friend. Be warm without getting sentimental, and connect the card's meaning to a useful idea the person can consider. Don't claim to know their private life or predict the future. Keep it conversational and under 800 characters. No lists or headings.

${readingContext}`

      const prompt = isWholesome ? wholesomePrompt : sarcasticPrompt

      logger.info('[Divine] Requesting AI interpretation')
      const aiService = getAIService()
      const aiInterpretation = await aiService.createChatCompletion(
        [{ role: 'user', content: prompt }],
        {
          temperature: temperature,
          max_tokens: maxTokens,
          guildId: interaction.guildId
        }
      )
      logger.info('[Divine] Received AI interpretation')

      const embed = new EmbedBuilder()
        .setTitle(`🔮 ${card.name}${isReversed ? ' · Reversed' : ''}`)
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
              ? 'Traditional meaning'
              : 'Traditional meaning (continued)',
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
              ? (isWholesome ? 'Your reading' : 'The cards, with commentary')
              : 'Reading (continued)',
          value: part,
          inline: false
        })
      })

      embed.setFooter({
        text: `Take what resonates and leave what doesn’t. The cards are a prompt for reflection.\n\nSeed: ${cardIndex}-${
          isReversed ? '1' : '0'
        }-${temperature}-${isWholesome ? '1' : '0'}-${meanness}`
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
        .setTitle('🔮 The reading didn’t come through')
        .setDescription(
          'I couldn’t finish your reading just now. Please try again in a little while.'
        )
        .setColor('#FF0000')
        .addFields({
          name: 'What happened?',
          value: 'Something interrupted the reading before it was ready.'
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
