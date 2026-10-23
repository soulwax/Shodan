import { PERSONAS } from '../data/personas'
import type { PersonaProfile } from '../data/personas'
import { randomIndex } from '../utils/random'

export type DissasociationMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}
export type PersonaPurpose = 'delivery' | 'visual'

/** Applies a random or explicitly selected fictional persona to an AI request. */
export class DissasociationEngine {
  applyRandom(
    messages: readonly DissasociationMessage[],
    purpose: PersonaPurpose = 'delivery'
  ): DissasociationMessage[] {
    if (!PERSONAS.length) return messages.map((message) => ({ ...message }))
    const persona = PERSONAS[randomIndex(PERSONAS.length)]
    return persona
      ? this.applyPersona(messages, persona, purpose)
      : messages.map((message) => ({ ...message }))
  }

  applyPersona(
    messages: readonly DissasociationMessage[],
    persona: PersonaProfile | null,
    purpose: PersonaPurpose = 'delivery'
  ): DissasociationMessage[] {
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
    const useInstruction =
      purpose === 'visual'
        ? 'Use this fictional profile as visual inspiration for atmosphere, palette, motifs, and lighting. Preserve the requested subject and explicit design details; do not add the persona as a figure unless requested.'
        : 'Use this fictional profile only to lightly shape delivery. Follow the request’s task, explicit tone, format, and safety constraints. Do not mention the persona, recite its biography, attribute its traits or history to the user or subject, or invent personal facts.'
    return [
      `[Dissasociation Engine — fictional persona: ${persona.name}]`,
      `Profile: ${persona.sex}, age ${persona.age}, ${persona.occupation} from ${persona.origin}.`,
      `Background: ${persona.background}`,
      `Temperament: ${persona.temperament}.`,
      `Traits: ${persona.traits.join(', ')}.`,
      `Values: ${persona.values.join(', ')}.`,
      `Mannerisms: ${persona.mannerisms.join(', ')}.`,
      `Voice direction: ${persona.voice}.`,
      useInstruction
    ].join('\n')
  }
}

export const dissasociationEngine = new DissasociationEngine()
