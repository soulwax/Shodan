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

import type {
  AIConfiguration,
  ChatMessage,
  ImageData,
  Provider,
  ProviderGenerationOptions
} from '../../../types/ai'
import { generateOpenAICompatible } from './openai-compatible'
import { generateGemini } from './gemini'
import { generateAnthropic } from './anthropic'
import { generateCloudflare } from './cloudflare'

/** Provider adapters translate requests and reject incomplete responses. */
export function generateProviderText(
  configuration: AIConfiguration,
  provider: Provider,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  imageUrl?: string,
  image?: ImageData
): Promise<string | null> {
  const apiKey = configuration.apiKeys[provider]
  if (!apiKey) throw new Error(`No credentials configured for ${provider}`)
  switch (provider) {
    case 'gemini':
      return generateGemini(apiKey, messages, options, image)
    case 'anthropic':
      return generateAnthropic(apiKey, messages, options, image)
    case 'cloudflare':
      return generateCloudflare(
        apiKey,
        configuration.cloudflareAccountId,
        messages,
        options,
        image
      )
    case 'openai':
    case 'grok':
      return generateOpenAICompatible(
        apiKey,
        provider,
        messages,
        options,
        imageUrl
      )
  }
}
