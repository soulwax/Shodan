import { EmbedBuilder } from 'discord.js';
import type { DivinationReading } from '../services/divination-reading';
import { getReadingLimits } from '../services/divination-prompts';
import { splitLongText, truncateAtBoundary } from '../utils/text';

export function buildDivinationEmbed(reading: DivinationReading, aiInterpretation: string): EmbedBuilder {
  const { question, spread, draws, wholesome, persona, replaySeed } = reading;
  const { maxCharacters: maxReadingCharacters } = getReadingLimits(spread);
  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${spread.name}`)
    .setColor('#9B59B6')
    .addFields({ name: 'Your Question', value: question, inline: false })
  
  draws.forEach((draw) => {
    const meaning = draw.reversed
      ? draw.card.meaning_rev
      : draw.card.meaning_up
    const value = `${draw.card.name}${draw.reversed ? ' · Reversed' : ''}\n${meaning}`
    splitLongText(value).forEach((part, index) =>
      embed.addFields({
        name:
          index === 0
            ? draw.position.name
            : `${draw.position.name} (continued)`,
        value: part,
        inline: false
      })
    )
  })
  
  splitLongText(
    truncateAtBoundary(aiInterpretation.trim(), maxReadingCharacters)
  ).forEach((part, index) =>
    embed.addFields({
      name:
        index === 0
          ? wholesome
            ? 'Your reading'
            : 'The cards, with commentary'
          : 'Reading (continued)',
      value: part,
      inline: false
    })
  )
  embed.setFooter({
    text: `Voice: ${wholesome ? 'Kind, perceptive friend' : persona.name}\nTake what resonates and leave what doesn’t. This is a prompt for reflection.\n\nSeed: ${replaySeed}`
  })
  return embed;
}
