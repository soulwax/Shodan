import type { AIConfiguration, ChatMessage, ImageData, Provider, ProviderGenerationOptions } from '../../../types/ai';
import { generateOpenAICompatible } from './openai-compatible';
import { generateGemini } from './gemini';
import { generateAnthropic } from './anthropic';
import { generateCloudflare } from './cloudflare';

/** Provider adapters translate requests and reject incomplete responses. */
export function generateProviderText(
  configuration: AIConfiguration,
  provider: Provider,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  imageUrl?: string,
  image?: ImageData
): Promise<string | null> {
  const apiKey = configuration.apiKeys[provider];
  if (!apiKey) throw new Error(`No credentials configured for ${provider}`);
  switch (provider) {
    case 'gemini': return generateGemini(apiKey, messages, options, image);
    case 'anthropic': return generateAnthropic(apiKey, messages, options, image);
    case 'cloudflare': return generateCloudflare(apiKey, configuration.cloudflareAccountId, messages, options, image);
    case 'openai':
    case 'grok': return generateOpenAICompatible(apiKey, provider, messages, options, imageUrl);
  }
}
