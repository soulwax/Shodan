import { fetchWithProviderTimeout, providerHttpError } from '../http';
import type { ChatMessage, ImageData, ProviderGenerationOptions } from '../../../types/ai';

export async function generateCloudflare(
  apiKey: string,
  accountId: string | undefined,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  image?: ImageData
): Promise<string | null> {
  if (!accountId) throw new Error('CF_ACCOUNT_ID is required with CF_TOKEN');

  const model = image
    ? '@cf/meta/llama-3.2-11b-vision-instruct'
    : options.model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const prompt = [
    messages.find(message => message.role === 'system')?.content,
    ...messages.filter(message => message.role !== 'system').map(message => `${message.role}: ${message.content}`)
  ].filter(Boolean).join('\n\n');
  const response = await fetchWithProviderTimeout('Cloudflare Workers AI', `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      ...(image ? { image: `data:${image.mimeType};base64,${image.data}` } : {}),
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
      max_tokens: options.max_tokens ?? 1000
    })
  });
  if (!response.ok) throw await providerHttpError('Cloudflare Workers AI', response);
  const payload = await response.json() as {
    result?: { response?: string; finish_reason?: string; stop_reason?: string };
    success?: boolean;
    errors?: Array<{ message?: string }>;
  };
  if (payload.success === false || payload.errors?.length) {
    const detail = payload.errors?.map(error => error.message).filter(Boolean).join('; ') || 'unknown error';
    throw new Error(`Cloudflare Workers AI request failed: ${detail}`);
  }
  if (payload.result?.finish_reason === 'length' || payload.result?.stop_reason === 'max_tokens') {
    throw new Error('Cloudflare Workers AI stopped at the output token limit; its response was incomplete');
  }
  return payload.result?.response || null;
}

