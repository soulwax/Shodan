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
