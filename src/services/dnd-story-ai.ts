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

import type { DndStoryKind } from '@prisma/client';
import { storyKindLabel } from '../data/dnd-story';
import { DND_PROMPTS } from '../data/prompts/dnd';
import { getAIService } from './ai';
import { truncateAtBoundary } from '../utils/text';

export interface CampaignStoryNote {
  id: string;
  kind: DndStoryKind;
  content: string;
  interpretation: string | null;
}

export async function answerFromJournal(
  question: string,
  entries: CampaignStoryNote[],
  bigPicture: string | null
): Promise<string> {
  const response = await getAIService().generateText([
    {
      role: 'system',
      content: DND_PROMPTS.journalAnswer.system
    },
    {
      role: 'user',
      content: DND_PROMPTS.journalAnswer.user(
        bigPicture,
        question,
        entries.map(entry => `[#${entry.id.slice(0, 8)}] [${storyKindLabel(entry.kind)}] Memory: ${entry.interpretation || '(not indexed yet)'}\nSource note: ${entry.content}`).join('\n')
      )
    }
  ], { temperature: 0.25, max_tokens: 350 });
  if (!response?.trim()) throw new Error('AI returned an empty journal answer');
  return truncateAtBoundary(response.trim(), 3900);
}

export async function createCampaignBigPicture(entries: CampaignStoryNote[]): Promise<string> {
  const context = entries.slice().reverse().map(entry =>
    `[#${entry.id.slice(0, 8)}] [${storyKindLabel(entry.kind)}] ${entry.interpretation || `Not yet interpreted; source note: ${entry.content}`}`
  ).join('\n');
  const response = await getAIService().generateText([
    {
      role: 'system',
      content: DND_PROMPTS.campaignBigPicture.system
    },
    { role: 'user', content: DND_PROMPTS.campaignBigPicture.user(context) }
  ], { temperature: 0.25, max_tokens: 500 });
  if (!response?.trim()) throw new Error('AI returned an empty campaign big picture');
  return truncateAtBoundary(response.trim(), 3900);
}

export async function createCampaignRecap(
  entries: CampaignStoryNote[],
  bigPicture: string | null,
  focus?: string
): Promise<string> {
  const response = await getAIService().generateText([
    {
      role: 'system',
      content: DND_PROMPTS.campaignRecap.system
    },
    {
      role: 'user',
      content: DND_PROMPTS.campaignRecap.user({
        bigPicture,
        focus,
        entries: entries.map((entry, index) => `${index + 1}. [#${entry.id.slice(0, 8)}] [${storyKindLabel(entry.kind)}] ${entry.interpretation || entry.content}`).join('\n')
      })
    }
  ], { temperature: 0.35, max_tokens: 320 });
  if (!response?.trim()) throw new Error('AI returned an empty recap');
  return truncateAtBoundary(response.trim(), 3900);
}
