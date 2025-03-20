// File: src/commands/tarot/divine.ts

import { createCanvas, loadImage } from 'canvas';
import crypto from 'crypto';
import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getOpenAIService } from '../../services/openai';
import { Card } from '../../types/card'; // Import the Card interface
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

// Define CardData interface before using it
interface CardData {
  nhits: number;
  cards: Card[];
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
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      await interaction.deferReply();
      logger.info('[Divine] Command triggered');

      const cardDataPath = path.join(__dirname, '../../../static/card-data.json');
      logger.info(`[Divine] Loading card data from: ${cardDataPath}`);

      const cardDataRaw = fs.readFileSync(cardDataPath, 'utf8');
      const cardData: CardData = JSON.parse(cardDataRaw); // Fix type here

      const question = interaction.options.getString('question');
      const seedParam = interaction.options.getString('seed');
      const maxTokens = 800;
      logger.info(`[Divine] Question: ${question}`);
      logger.info(`[Divine] Seed parameter: ${seedParam}`);

      let cardIndex: number, isReversed: boolean, temperature: number, isWholesome: boolean;
      if (seedParam) {
        const [seedIndex, seedReversed, seedTemp, seedWholesome] = seedParam.split('-');
        cardIndex = parseInt(seedIndex);
        isReversed = seedReversed === '1';
        temperature = parseFloat(seedTemp);
        isWholesome = seedWholesome === '1';
        logger.info('[Divine] Using seed values:', { cardIndex, isReversed, temperature, isWholesome });
      } else {
        cardIndex = crypto.randomInt(0, cardData.cards.length);
        isReversed = crypto.randomInt(0, 2) === 1;
        temperature = 0.7;
        isWholesome = interaction.options.getBoolean('wholesome') ?? false;
        logger.info('[Divine] Generated random values:', { cardIndex, isReversed, temperature, isWholesome });
      }

      const card = cardData.cards[cardIndex];
      logger.info(`[Divine] Drew card: ${card.name} ${isReversed ? '(reversed)' : '(upright)'}`);


      // Determine suit code for filename
      const getSuitCode = (card: Card): string => {
        if (card.type === 'major') return 'm';
        if (card.suit === 'cups') return 'c';
        if (card.suit === 'wands') return 'w';
        if (card.suit === 'swords') return 's';
        return 'p'; // pentacles
      };

      const suit = getSuitCode(card);

      // Generate filename
      let imageFilename: string;
      if (card.type === 'major') {
        const num = card.value_int.toString().padStart(2, '0');
        const name = card.name
          .toLowerCase()
          .replace(/^the\s+/i, '')
          .replace(/\s+last\s+/i, '')
          .replace(/\s+/g, '');
        imageFilename = `${suit}_${num}_${name}.jpg`;
        logger.info(`[Divine] Generated filename: ${imageFilename}`);
      } else {
        if (['page', 'knight', 'queen', 'king'].includes(card.value || '')) {
          imageFilename = `${suit}_${card.value}.jpg`;
        } else if (card.value === 'ace') {
          imageFilename = `${suit}_ace.jpg`;
        } else {
          imageFilename = `${suit}_${card.value_int}.jpg`;
        }
      }

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
      1. Be weirdly specific (unlike ${interaction.user.username}'s life choices) but also delivered with a tone of absolute patronizing superiority.
      2. Include at least one scathing comparison or metaphor that hits too close to home
      3. Give actual advice, but wrap it in layers of sarcasm
      4. Keep the mystical elements while mocking them simultaneously
      5. Be as subtle as a brick through a window (bonus points for painful truths)
      6. Make it hurt a little less if it's a good card, or a little more if it's a bad one.
      7. The last paragraph should be an encouraging message, but with a twist of cosmic irony.
      8. You are not reddit, remember that. Do not use redditor smugness.
      9. Add unpredictability to your rhetoric but stay close to the card's essence and question asked.
  
      Make it memorable, make it hurt, but keep it under 800 characters - we don't have all day to unpack your cosmic baggage.
      
      Remember: If someone wanted a generic reading, they'd ask their horoscope app. Now let's see what fresh hell the cards have prepared... 🔮`;

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
      
      Remember: Every card holds a gift of understanding, and every seeker deserves to be met with compassion. Let's discover what light the cards have to share... ✨`;

      const prompt = isWholesome ? wholesomePrompt : sarcasticPrompt;

      logger.info('[Divine] Requesting AI interpretation');
      const openAIService = getOpenAIService();
      const aiInterpretation = await openAIService.createChatCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: 'gpt-4-1106-preview',
          temperature: temperature,
          max_tokens: maxTokens
        }
      );
      logger.info('[Divine] Received AI interpretation');

      const embed = new EmbedBuilder()
        .setTitle(`🔮 ${card.name}${isReversed ? ' (Reversed)' : ''}`)
        .setColor('#9B59B6');

      const imagePath = path.join(
        __dirname,
        '../../../static/rider-waite',
        imageFilename
      );
      logger.info(`[Divine] Looking for image at: ${imagePath}`);

      if (question) {
        embed.addFields({
          name: 'Your Question',
          value: question,
          inline: false
        });
      }

      const meaning = isReversed ? card.meaning_rev : card.meaning_up;
      const splitLongText = (text: string, maxLength = 1024): string[] => {
        if (text.length <= maxLength) return [text];
      
        const parts: string[] = [];
        let remainingText = text;
      
        while (remainingText.length > maxLength) {
          let splitIndex = remainingText.lastIndexOf('.', maxLength);
          if (splitIndex === -1)
            splitIndex = remainingText.lastIndexOf(' ', maxLength);
          if (splitIndex === -1) splitIndex = maxLength;
      
          parts.push(remainingText.substring(0, splitIndex + 1));
          remainingText = remainingText.substring(splitIndex + 1).trim();
        }
      
        if (remainingText.length > 0) parts.push(remainingText);
        return parts;
      };
      
      const meaningParts = splitLongText(meaning);
      meaningParts.forEach((part, index) => {
        embed.addFields({
          name:
            index === 0
              ? 'Traditional Meaning'
              : 'Traditional Meaning (continued)',
          value: part,
          inline: false
        });
      });

      const aiParts = splitLongText(aiInterpretation ?? 'No interpretation available');
      aiParts.forEach((part, index) => {
        embed.addFields({
          name:
            index === 0
              ? 'Personalized Reading'
              : 'Personalized Reading (continued)',
          value: part,
          inline: false
        });
      });

      embed.setFooter({
        text: `The cards offer guidance, but you chart your own path. Trust your intuition.\n\nxSeed: ${cardIndex}-${
          isReversed ? '1' : '0'
        }-${temperature}-${isWholesome ? '1' : '0'}`
      });

      if (fs.existsSync(imagePath)) {
        try {
          const img = await loadImage(imagePath);
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');

          if (isReversed) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
          }

          ctx.drawImage(img, 0, 0);

          const buffer = canvas.toBuffer('image/jpeg');

          logger.info('[Divine] Image found, attaching to embed');
          await interaction.editReply({
            embeds: [embed],
            files: [
              {
                attachment: buffer,
                name: imageFilename
              }
            ]
          });
        } catch (err) {
          logger.error('[Divine] Error processing image:', err);
          await interaction.editReply({ embeds: [embed] });
        }
      } else {
        logger.info('[Divine] Image not found, sending embed without image');
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('[Divine] Error in divine command:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔮 Error')
        .setDescription(
          'The spirits are unclear at this moment. Please try again later.'
        )
        .setColor('#FF0000')
        .addFields({
          name: 'Error Details',
          value: 'There was an issue connecting with the mystical forces.'
        });

      try {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (replyError) {
        logger.error('[Divine] Error sending error message:', replyError);
      }
    }
  }
};

export default divineCommand;