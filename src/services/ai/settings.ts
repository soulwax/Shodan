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

import { DEFAULT_AI_TEMPERATURE, DEFAULT_AI_REASONING_EFFORT } from '../../config/ai';
import { getPersonaById, RANDOM_PERSONA_ID } from '../../data/personas';
import type { PersonaProfile } from '../../data/personas';
import type { GenerationOptions, ReasoningEffort, ResolvedGenerationOptions } from '../../types/ai';

export async function resolveGenerationOptions(options: GenerationOptions): Promise<ResolvedGenerationOptions> {
  const {
    guildId,
    preserveExplicitTemperature = false,
    disassociation = 'random',
    ...requestOptions
  } = options;
  delete requestOptions.personaPurpose;
  const requestContext = (await import('../ai-context.js')).getAIRequestContext();
  const settingsGuildId = guildId ?? requestContext?.guildId ?? null;
  let temperature = requestOptions.temperature ?? DEFAULT_AI_TEMPERATURE;
  let max_tokens = requestOptions.max_tokens;
  let reasoning_effort = requestOptions.reasoning_effort ?? DEFAULT_AI_REASONING_EFFORT;
  let persona: PersonaProfile | null = null;

  if (settingsGuildId) {
    const { prisma } = await import('../prisma.js');
    const settings = await prisma.dndServer.findUnique({
      where: { discordId: settingsGuildId },
      select: { id: true, aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true, divinePersonality: true }
    });
    if (settings) {
      if (disassociation === 'server') {
        persona = getPersonaById(settings.divinePersonality) ?? null;
      }
      if (!preserveExplicitTemperature || requestOptions.temperature === undefined) {
        temperature = settings.aiTemperature;
      }
      max_tokens = settings.aiMaxTokens ?? max_tokens;
      reasoning_effort = settings.aiReasoningEffort as ReasoningEffort;
    } else {
      // Keep new servers on the same default shown by /ai-settings show.
      temperature = DEFAULT_AI_TEMPERATURE;
      reasoning_effort = DEFAULT_AI_REASONING_EFFORT;
    }
    const styleProfile = settings && requestContext?.userId
      ? await prisma.userWritingStyle.findUnique({
          where: { serverId_discordUserId: { serverId: settings.id, discordUserId: requestContext.userId } },
          select: { profile: true }
        })
      : null;
    const profile = styleProfile ? formatStyleProfile(styleProfile.profile) : null;
    if (profile) requestOptions.styleInstruction = profile;
  }

  return {
    options: { ...requestOptions, temperature, max_tokens, reasoning_effort },
    persona
  };
}

export async function getServerPersona(guildId?: string | null): Promise<PersonaProfile | null> {
  if (!guildId) return null;
  const { prisma } = await import('../prisma.js');
  const settings = await prisma.dndServer.findUnique({
    where: { discordId: guildId },
    select: { divinePersonality: true }
  });
  return getPersonaById(settings?.divinePersonality ?? RANDOM_PERSONA_ID) ?? null;
}

export function formatStyleProfile(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  const values = [
    profile.avgWordsPerSentence,
    profile.avgWordLength,
    profile.lowercaseSentenceStartRatio,
    profile.emojiPer100Words,
    profile.exclamationPer100Sentences,
    profile.questionPer100Sentences,
    profile.contractionPer100Words
  ];
  if (!values.every(item => typeof item === 'number' && Number.isFinite(item))) return null;
  const [sentenceLength, wordLength, lowercaseStarts, emojis, exclamations, questions, contractions] = values as number[];
  return `The requesting user opted into a writing-style preference. Match these broad style traits where natural: about ${Math.round(sentenceLength)} words per sentence; average word length ${wordLength.toFixed(1)} characters; ${Math.round(lowercaseStarts * 100)}% lowercase sentence openings; ${emojis.toFixed(1)} emoji per 100 words; ${exclamations.toFixed(1)} exclamation marks per 100 sentences; ${questions.toFixed(1)} question marks per 100 sentences; ${contractions.toFixed(1)} contractions per 100 words. Do not reuse wording or personal details from their samples.`;
}

