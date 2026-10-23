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

import type { PersonaProfile } from '../personas'

export const PERSONA_PROMPTS = {
  visualUse: 'Use this fictional profile as visual inspiration for atmosphere, palette, motifs, and lighting. Preserve the requested subject and explicit design details; do not add the persona as a figure unless requested.',
  deliveryUse: 'Use this fictional profile only to lightly shape delivery. Follow the request’s task, explicit tone, format, and safety constraints. Do not mention the persona, recite its biography, attribute its traits or history to the user or subject, or invent personal facts.',
  formatProfile(persona: PersonaProfile): string[] {
    return [
      `[Disassociation Engine — fictional persona: ${persona.name}]`,
      `Profile: ${persona.sex}, age ${persona.age}, ${persona.occupation} from ${persona.origin}.`,
      `Background: ${persona.background}`,
      `Temperament: ${persona.temperament}.`,
      `Traits: ${persona.traits.join(', ')}.`,
      `Values: ${persona.values.join(', ')}.`,
      `Mannerisms: ${persona.mannerisms.join(', ')}.`,
      `Voice direction: ${persona.voice}.`
    ]
  }
} as const
