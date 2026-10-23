import type { AIConfiguration, Provider, ReasoningEffort } from '../types/ai';

export const DEFAULT_AI_TEMPERATURE = 1.0;
export const DEFAULT_AI_REASONING_EFFORT: ReasoningEffort = 'low';
export const DEFAULT_AI_REQUESTS_PER_MINUTE = 10;
export const PROVIDER_FALLBACK_ORDER: readonly Provider[] = ['gemini', 'openai', 'cloudflare', 'grok', 'anthropic'];

export const providerNames: Record<Provider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  grok: 'Grok',
  anthropic: 'Claude',
  cloudflare: 'Cloudflare Workers AI'
};

/** Parse only AI configuration; no credentials are loaded or logged here. */
export function loadAIConfiguration(env: NodeJS.ProcessEnv): AIConfiguration {
  const grokKey = env.XAI_API_KEY?.trim() || env.GROK_API_KEY?.trim();
  const apiKeys = {
    openai: env.OPENAI_API_KEY?.trim() || undefined,
    gemini: env.GEMINI_API_KEY?.trim() || undefined,
    grok: grokKey || undefined,
    anthropic: env.ANTHROPIC_API_KEY?.trim() || undefined,
    cloudflare: env.CF_TOKEN?.trim() && env.CF_ACCOUNT_ID?.trim() ? env.CF_TOKEN.trim() : undefined
  };
  const cloudflareAccountId = env.CF_ACCOUNT_ID?.trim() || undefined;
  const requestedRate = Number(env.AI_REQUESTS_PER_MINUTE);
  const requestsPerMinute = Number.isInteger(requestedRate) && requestedRate >= 1 && requestedRate <= 60
    ? requestedRate
    : DEFAULT_AI_REQUESTS_PER_MINUTE;
  return { apiKeys, cloudflareAccountId, requestsPerMinute };
}
