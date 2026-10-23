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

import { fetchWithProviderTimeout, providerHttpError } from '../http'
import type {
  ChatMessage,
  ImageData,
  ProviderGenerationOptions
} from '../../../types/ai'

export async function generateAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  image?: ImageData
): Promise<string | null> {
  const userMessages = messages.filter((message) => message.role !== 'system')
  const lastUserIndex = userMessages
    .map((message) => message.role)
    .lastIndexOf('user')
  const anthropicMessages = userMessages.map((message, index) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [
      ...(image && index === lastUserIndex
        ? [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mimeType,
                data: image.data
              }
            }
          ]
        : []),
      { type: 'text', text: message.content }
    ]
  }))
  const system = messages.find((message) => message.role === 'system')?.content
  const response = await fetchWithProviderTimeout(
    'Anthropic',
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: options.max_tokens ?? 1000,
        ...(system ? { system } : {}),
        messages: anthropicMessages
      })
    }
  )
  if (!response.ok) throw await providerHttpError('Anthropic', response)
  const result = (await response.json()) as {
    stop_reason?: string
    content?: Array<{ type?: string; text?: string }>
  }
  if (result.stop_reason === 'max_tokens') {
    throw new Error(
      'Claude stopped at the output token limit; its response was incomplete'
    )
  }
  return (
    result.content
      ?.filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('') || null
  )
}
