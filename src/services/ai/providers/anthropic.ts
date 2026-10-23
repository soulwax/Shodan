import { fetchWithProviderTimeout, providerHttpError } from '../http';
import type { ChatMessage, ImageData, ProviderGenerationOptions } from '../../../types/ai';

export async function generateAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  image?: ImageData
): Promise<string | null> {
  const userMessages = messages.filter(message => message.role !== 'system');
  const lastUserIndex = userMessages.map(message => message.role).lastIndexOf('user');
  const anthropicMessages = userMessages.map((message, index) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [
      ...(image && index === lastUserIndex ? [{
        type: 'image',
        source: { type: 'base64', media_type: image.mimeType, data: image.data }
      }] : []),
      { type: 'text', text: message.content }
    ]
  }));
  const system = messages.find(message => message.role === 'system')?.content;
  const response = await fetchWithProviderTimeout('Anthropic', 'https://api.anthropic.com/v1/messages', {
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
  });
  if (!response.ok) throw await providerHttpError('Anthropic', response);
  const result = await response.json() as { stop_reason?: string; content?: Array<{ type?: string; text?: string }> };
  if (result.stop_reason === 'max_tokens') {
    throw new Error('Claude stopped at the output token limit; its response was incomplete');
  }
  return result.content?.filter(part => part.type === 'text').map(part => part.text || '').join('') || null;
}

