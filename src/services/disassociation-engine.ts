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

import { PERSONAS } from '../data/personas'
import type { PersonaProfile } from '../data/personas'
import { PERSONA_PROMPTS } from '../data/prompts/personas'
import { randomIndex } from '../utils/random'

export type DisassociationMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}
export type PersonaPurpose = 'delivery' | 'visual'

/** Applies a random or explicitly selected fictional persona to an AI request. */
export class DisassociationEngine {
  applyRandom(
    messages: readonly DisassociationMessage[],
    purpose: PersonaPurpose = 'delivery'
  ): DisassociationMessage[] {
    if (!PERSONAS.length) return messages.map((message) => ({ ...message }))
    const persona = PERSONAS[randomIndex(PERSONAS.length)]
    return persona
      ? this.applyPersona(messages, persona, purpose)
      : messages.map((message) => ({ ...message }))
  }

  applyPersona(
    messages: readonly DisassociationMessage[],
    persona: PersonaProfile | null,
    purpose: PersonaPurpose = 'delivery'
  ): DisassociationMessage[] {
    const preparedMessages = messages.map((message) => ({ ...message }))
    if (!persona) return preparedMessages

    const instruction = this.buildInstruction(persona, purpose)
    const systemIndex = preparedMessages.findIndex(
      (message) => message.role === 'system'
    )
    if (systemIndex >= 0) {
      preparedMessages[systemIndex] = {
        ...preparedMessages[systemIndex],
        content: `${preparedMessages[systemIndex].content}\n\n${instruction}`
      }
    } else {
      preparedMessages.unshift({ role: 'system', content: instruction })
    }
    return preparedMessages
  }

  private buildInstruction(
    persona: PersonaProfile,
    purpose: PersonaPurpose
  ): string {
    const useInstruction = purpose === 'visual'
      ? PERSONA_PROMPTS.visualUse
      : PERSONA_PROMPTS.deliveryUse
    return [
      ...PERSONA_PROMPTS.formatProfile(persona),
      useInstruction
    ].join('\n')
  }
}

export const disassociationEngine = new DisassociationEngine()
