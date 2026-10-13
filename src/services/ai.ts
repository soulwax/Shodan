// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { OpenAI, type ChatCompletionMessageParam } from 'openai';
import { logger } from '../utils/logger';

type Provider = 'openai' | 'gemini' | 'grok' | 'anthropic';
type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type GenerationOptions = { model?: string; temperature?: number; max_tokens?: number };

const providerNames: Record<Provider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  grok: 'Grok',
  anthropic: 'Claude'
};

/** Shared AI service with automatic provider selection and failover. */
export class AIService {
  private readonly apiKeys: Partial<Record<Provider, string>>;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const grokKey = env.XAI_API_KEY?.trim() || env.GROK_API_KEY?.trim();
    this.apiKeys = {
      openai: env.OPENAI_API_KEY?.trim() || undefined,
      gemini: env.GEMINI_API_KEY?.trim() || undefined,
      grok: grokKey || undefined,
      anthropic: env.ANTHROPIC_API_KEY?.trim() || undefined
    };
  }

  async createChatCompletion(messages: ChatMessage[], options: GenerationOptions = {}): Promise<string | null> {
    const { temperature = 0.7, max_tokens = 1000 } = options;
    return this.withProviderFallback(provider =>
      this.generateText(provider, messages, { ...options, temperature, max_tokens })
    );
  }

  async createVisionCompletion(
    systemPrompt: string,
    textPrompt: string,
    imageUrl: string,
    options: GenerationOptions = {}
  ): Promise<string | null> {
    const { temperature = 0.9, max_tokens = 300 } = options;
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: textPrompt }
    ];
    let imageDataPromise: Promise<{ mimeType: string; data: string }> | undefined;

    return this.withProviderFallback(provider => {
      if (provider === 'gemini' || provider === 'anthropic') {
        imageDataPromise ??= this.downloadImage(imageUrl);
        return imageDataPromise.then(image =>
          provider === 'gemini'
            ? this.generateGemini(messages, { temperature, max_tokens }, image)
            : this.generateAnthropic(messages, { max_tokens }, image)
        );
      }
      return this.generateOpenAICompatible(provider, messages, { temperature, max_tokens }, imageUrl);
    });
  }

  private async withProviderFallback(
    request: (provider: Provider) => Promise<string | null>
  ): Promise<string | null> {
    const providers = (['openai', 'gemini', 'grok', 'anthropic'] as Provider[])
      .filter(provider => this.apiKeys[provider]);

    if (providers.length === 0) {
      throw new Error('Set at least one AI key: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY, or ANTHROPIC_API_KEY');
    }

    let lastError: unknown;
    for (const provider of providers) {
      try {
        const response = await request(provider);
        if (response?.trim()) {
          logger.info(`AI response generated with ${providerNames[provider]}`);
          return response;
        }
        lastError = new Error('Provider returned an empty response');
        logger.warn(`${providerNames[provider]} returned an empty response; trying the next configured provider`);
      } catch (error) {
        lastError = error;
        const errorName = error instanceof Error ? error.name : 'Unknown error';
        logger.warn(`${providerNames[provider]} request failed (${errorName}); trying the next configured provider`);
      }
    }

    logger.error('All configured AI providers failed');
    if (lastError instanceof Error) {
      logger.error(`Final AI provider error: ${lastError.name}`);
    }
    throw new Error('All configured AI providers failed to generate a response');
  }

  private async generateText(
    provider: Provider,
    messages: ChatMessage[],
    options: GenerationOptions
  ): Promise<string | null> {
    if (provider === 'gemini') return this.generateGemini(messages, options);
    if (provider === 'anthropic') return this.generateAnthropic(messages, options);
    return this.generateOpenAICompatible(provider, messages, options);
  }

  private async generateOpenAICompatible(
    provider: 'openai' | 'grok',
    messages: ChatMessage[],
    options: GenerationOptions,
    imageUrl?: string
  ): Promise<string | null> {
    const client = new OpenAI({
      apiKey: this.apiKeys[provider]!,
      ...(provider === 'grok' ? { baseURL: 'https://api.x.ai/v1' } : {})
    });
    const model = provider === 'grok' ? 'grok-4.7' : options.model || 'gpt-4.1-mini';
    const apiMessages: ChatCompletionMessageParam[] = imageUrl
      ? [
          ...messages
            .filter(message => message.role === 'system')
            .map(message => ({ role: 'system' as const, content: message.content })),
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              { type: 'text', text: messages.filter(message => message.role === 'user').map(message => message.content).join('\n') }
            ]
          }
        ]
      : messages;

    const response = await client.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: options.temperature,
      max_tokens: options.max_tokens
    });
    return response.choices[0]?.message?.content ?? null;
  }

  private async generateGemini(
    messages: ChatMessage[],
    options: GenerationOptions,
    image?: { mimeType: string; data: string }
  ): Promise<string | null> {
    const contents = messages
      .filter(message => message.role !== 'system')
      .map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [
          { text: message.content },
          ...(image && message.role === 'user' ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : [])
        ]
      }));
    const systemInstruction = messages.find(message => message.role === 'system')?.content;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKeys.gemini! },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        generationConfig: {
          ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
          maxOutputTokens: options.max_tokens ?? 1000
        }
      })
    });
    if (!response.ok) throw new Error(`Gemini API returned HTTP ${response.status}`);
    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || null;
  }

  private async generateAnthropic(
    messages: ChatMessage[],
    options: GenerationOptions,
    image?: { mimeType: string; data: string }
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKeys.anthropic!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: options.max_tokens ?? 1000,
        ...(system ? { system } : {}),
        messages: anthropicMessages
      })
    });
    if (!response.ok) throw new Error(`Anthropic API returned HTTP ${response.status}`);
    const result = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    return result.content?.filter(part => part.type === 'text').map(part => part.text || '').join('') || null;
  }

  private async downloadImage(imageUrl: string): Promise<{ mimeType: string; data: string }> {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Unable to fetch image (HTTP ${response.status})`);
    const mimeType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
    if (!mimeType || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
      throw new Error('Unsupported image format');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Image is larger than 10 MB');
    return { mimeType, data: bytes.toString('base64') };
  }
}

let aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!aiService) aiService = new AIService();
  return aiService;
}
