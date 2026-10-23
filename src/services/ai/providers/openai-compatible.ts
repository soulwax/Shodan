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

import { OpenAI } from 'openai';
import { providerNames } from '../../../config/ai';
import { PROVIDER_REQUEST_TIMEOUT_MS } from '../http';
import type { ChatMessage, ProviderGenerationOptions } from '../../../types/ai';

type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

export async function generateOpenAICompatible(
  apiKey: string,
  provider: 'openai' | 'grok',
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  imageUrl?: string
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: apiKey,
    timeout: PROVIDER_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
    ...(provider === 'grok' ? { baseURL: 'https://api.x.ai/v1' } : {})
  });
  const model = provider === 'grok' ? 'grok-4.7' : options.model || 'gpt-6-luna';
  const reasoningEffort = provider === 'openai' ? options.reasoning_effort ?? 'low' : undefined;
  // GPT-6 only accepts temperature when reasoning effort is none.
  const temperature = provider === 'openai' && reasoningEffort !== 'none' ? undefined : options.temperature;
  const lastUserIndex = imageUrl ? messages.map(message => message.role).lastIndexOf('user') : -1;
  const apiMessages: ChatCompletionMessageParam[] = messages.map((message, index) =>
    imageUrl && index === lastUserIndex
      ? {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: message.content }
          ]
        }
      : { role: message.role, content: message.content }
  );

  const requestBody = {
    model,
    messages: apiMessages,
    ...(temperature === undefined ? {} : { temperature }),
    ...(provider === 'openai'
      ? { max_completion_tokens: options.max_tokens }
      : { max_tokens: options.max_tokens }),
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {})
  };
  // The pinned SDK predates GPT-6's `none`/`xhigh`/`max` effort values.
  const response = await client.chat.completions.create(
    requestBody as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  );
  const choice = response.choices[0];
  if (choice?.finish_reason === 'length') {
    throw new Error(`${providerNames[provider]} stopped at the output token limit; its response was incomplete`);
  }
  return choice?.message?.content ?? null;
}

