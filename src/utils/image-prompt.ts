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

import { AIService } from '../services/ai';
import { FUN_PROMPTS } from '../data/prompts/fun';

export async function refineImagePrompt(
  ai: AIService,
  prompt: string,
  isEdit: boolean,
  guildId?: string | null
): Promise<string> {
  const systemPrompt = isEdit
    ? FUN_PROMPTS.refineImage.editSystem
    : FUN_PROMPTS.refineImage.generateSystem;
  const refinedPrompt = await ai.generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], {
    provider: 'openai',
    guildId,
    max_tokens: 400,
    disassociation: 'server',
    personaPurpose: 'visual'
  });

  if (!refinedPrompt?.trim()) {
    throw new Error(`Luna returned an empty ${isEdit ? 'image-edit' : 'image'} prompt`);
  }
  return refinedPrompt.trim();
}
