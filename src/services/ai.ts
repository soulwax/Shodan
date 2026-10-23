// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { loadAIConfiguration, PROVIDER_FALLBACK_ORDER, providerNames } from '../config/ai';
import { disassociationEngine } from './disassociation-engine';
import { logger } from '../utils/logger';
import { downloadImage, errorStatus } from './ai/http';
import { addStyleInstruction } from './ai/messages';
import * as media from './ai/media';
import { generateProviderText } from './ai/providers';
import { ProviderRequestScheduler } from './ai/request-scheduler';
import { getServerPersona, resolveGenerationOptions } from './ai/settings';
import type { AIConfiguration, ChatMessage, GenerationOptions, ImageData, Provider } from '../types/ai';

/** Public gateway: apply request preferences, then schedule provider work. */
export class AIService {
  private readonly configuration: AIConfiguration;
  private readonly scheduler: ProviderRequestScheduler;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.configuration = loadAIConfiguration(env);
    this.scheduler = new ProviderRequestScheduler(this.configuration.requestsPerMinute);
  }

  /** Shared language/vision gateway with random, saved-server, and no-persona modes. */
  async generateText(
    messages: ChatMessage[],
    options: GenerationOptions = {},
    imageUrl?: string
  ): Promise<string | null> {
    const providerPreference = options.provider ?? 'auto';
    if (providerPreference !== 'auto' && !this.configuration.apiKeys[providerPreference]) {
      throw new Error(`${providerNames[providerPreference]} credentials are required for this AI request`);
    }

    const resolved = await resolveGenerationOptions(options);
    const resolvedOptions = resolved.options;
    const { temperature = 1.0 } = resolvedOptions;
    const max_tokens = resolvedOptions.max_tokens ?? (
      imageUrl ? 300 : providerPreference === 'openai' ? 500 : 1000
    );
    const styledMessages = addStyleInstruction(messages, resolvedOptions.styleInstruction);
    const disassociation = options.disassociation ?? 'random';
    const personaPurpose = options.personaPurpose ?? 'delivery';
    const requestMessages = disassociation === 'none'
      ? styledMessages
      : disassociation === 'server'
        ? disassociationEngine.applyPersona(styledMessages, resolved.persona, personaPurpose)
        : disassociationEngine.applyRandom(styledMessages, personaPurpose);
    let imageDataPromise: Promise<ImageData> | undefined;

    const generate = async (provider: Provider): Promise<string | null> => {
      const providerOptions = { ...resolvedOptions, temperature, max_tokens };
      const needsImageData = imageUrl && ['gemini', 'anthropic', 'cloudflare'].includes(provider);
      const image = needsImageData ? await (imageDataPromise ??= downloadImage(imageUrl)) : undefined;
      return generateProviderText(this.configuration, provider, requestMessages, providerOptions, imageUrl, image);
    };

    if (providerPreference === 'auto') {
      return this.withProviderFallback(generate);
    }

    return this.scheduler.run(providerPreference, () => generate(providerPreference));
  }

  async generateImage(prompt: string): Promise<Buffer> {
    const apiKey = this.requireOpenAIKey('image generation');
    return this.scheduler.run('openai', () => media.generateImage(apiKey, prompt));
  }

  async editImage(prompt: string, imageUrl: string): Promise<Buffer> {
    const apiKey = this.requireOpenAIKey('image editing');
    media.validateImageUrl(imageUrl);
    return this.scheduler.run('openai', () => media.editImage(apiKey, prompt, imageUrl));
  }

  async generateSpeech(input: string, voice: string, guildId?: string | null): Promise<Buffer> {
    const apiKey = this.requireOpenAIKey('speech generation');
    const persona = await getServerPersona(guildId);
    const instructions = persona
      ? `Speak clearly and naturally using this fictional character’s delivery style: ${persona.voice}. Preserve the spoken text exactly; do not add biographical details or extra words.`
      : 'Speak clearly and naturally, with a friendly conversational tone.';
    return this.scheduler.run('openai', () => media.generateSpeech(apiKey, input, voice, instructions));
  }

  private requireOpenAIKey(purpose: string): string {
    const apiKey = this.configuration.apiKeys.openai;
    if (!apiKey) throw new Error(`OPENAI_API_KEY is required for ${purpose}`);
    return apiKey;
  }

  private async withProviderFallback(
    request: (provider: Provider) => Promise<string | null>
  ): Promise<string | null> {
    const providers = PROVIDER_FALLBACK_ORDER
      .filter(provider => this.configuration.apiKeys[provider]);

    if (providers.length === 0) {
      throw new Error('Set at least one AI provider key: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY, ANTHROPIC_API_KEY, or CF_TOKEN with CF_ACCOUNT_ID');
    }

    let lastError: unknown;
    const failures: string[] = [];
    for (const provider of providers) {
      try {
        const response = await this.scheduler.run(provider, () => request(provider));
        if (response?.trim()) {
          logger.info(`AI response generated with ${providerNames[provider]}`);
          return response;
        }
        lastError = new Error('Provider returned an empty response');
        logger.warn(`${providerNames[provider]} returned an empty response; trying the next configured provider`);
      } catch (error) {
        lastError = error;
        const status = errorStatus(error);
        const detail = error instanceof Error ? error.message : 'Unknown error';
        failures.push(`${providerNames[provider]}: ${detail}`);
        logger.warn(`${providerNames[provider]} request failed${status ? ` with HTTP ${status}` : ''}: ${detail}; trying the next configured provider`);
      }
    }

    logger.error('All configured AI providers failed');
    if (lastError instanceof Error) {
      logger.error(`Final AI provider error: ${lastError.name}`);
    }
    throw new Error(`All configured AI providers failed to generate a response. ${failures.join(' | ')}`);
  }

}

let aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!aiService) aiService = new AIService();
  return aiService;
}
