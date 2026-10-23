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

import { EmbedBuilder } from 'discord.js'
import type { DivinationReading } from '../services/divination-reading'
import { getReadingLimits } from '../services/divination-prompts'
import { splitLongText, truncateAtBoundary } from '../utils/text'

export function buildDivinationEmbed(
  reading: DivinationReading,
  aiInterpretation: string
): EmbedBuilder {
  const { question, spread, draws, wholesome, persona, replaySeed } = reading
  const { maxCharacters: maxReadingCharacters } = getReadingLimits(spread)
  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${spread.name}`)
    .setColor('#9B59B6')
    .addFields({ name: 'Your Question', value: question, inline: false })

  draws.forEach((draw) => {
    const meaning = draw.reversed ? draw.card.meaning_rev : draw.card.meaning_up
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
  return embed
}
