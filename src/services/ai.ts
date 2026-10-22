// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

type Provider = 'openai' | 'gemini' | 'grok' | 'anthropic' | 'cloudflare';
type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;
type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
type GenerationOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  reasoning_effort?: ReasoningEffort;
  guildId?: string | null;
  styleInstruction?: string;
  preserveExplicitTemperature?: boolean;
};
type ProviderJob = {
  run: () => Promise<string | null>;
  resolve: (value: string | null) => void;
  reject: (error: unknown) => void;
};
type ProviderQueue = {
  jobs: ProviderJob[];
  starts: number[];
  active: number;
  nextAllowedAt: number;
  blockedUntil: number;
  timer?: ReturnType<typeof setTimeout>;
};

const RATE_WINDOW_MS = 60_000;
const MAX_CONCURRENT_REQUESTS_PER_PROVIDER = 2;
const MAX_QUEUED_REQUESTS_PER_PROVIDER = 20;
const MAX_TRANSIENT_RETRIES = 2;
const RETRY_DELAYS_MS = [1_000, 3_000];
const PROVIDER_REQUEST_TIMEOUT_MS = 30_000;

class ProviderHttpError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

function errorStatus(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
}

function errorRetryAfter(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('retryAfterMs' in error && typeof error.retryAfterMs === 'number') return error.retryAfterMs;
  if (!('headers' in error) || !error.headers) return undefined;
  const headers = error.headers;
  const value = headers instanceof Headers
    ? headers.get('retry-after')
    : typeof headers === 'object' && 'retry-after' in headers
      ? String(headers['retry-after'])
      : undefined;
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value) - Date.now();
  return Number.isFinite(dateMs) ? Math.max(0, dateMs) : undefined;
}

async function providerHttpError(provider: string, response: Response): Promise<ProviderHttpError> {
  let message = 'No provider error detail';
  try {
    const body = await response.json() as { error?: { message?: string; status?: string }; errors?: Array<{ message?: string }> };
    message = body.error?.message || body.error?.status || body.errors?.map(error => error.message).filter(Boolean).join('; ') || message;
  } catch {
    // Some provider gateways return non-JSON errors.
  }
  const retryAfter = response.headers.get('retry-after');
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  const retryAt = retryAfter && !Number.isFinite(seconds) ? Date.parse(retryAfter) - Date.now() : NaN;
  const retryAfterMs = Number.isFinite(seconds)
    ? Math.max(0, seconds * 1000)
    : Number.isFinite(retryAt) ? Math.max(0, retryAt) : undefined;
  return new ProviderHttpError(`${provider} API returned HTTP ${response.status}: ${message}`, response.status, retryAfterMs);
}

async function fetchWithProviderTimeout(
  provider: string,
  input: string | URL,
  init?: RequestInit,
  timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${provider} request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const providerNames: Record<Provider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  grok: 'Grok',
  anthropic: 'Claude',
  cloudflare: 'Cloudflare Workers AI'
};

/** Shared AI service with automatic provider selection and failover. */
export class AIService {
  private readonly apiKeys: Partial<Record<Provider, string>>;
  private readonly cloudflareAccountId?: string;
  private readonly requestsPerMinute: number;
  private readonly providerQueues = new Map<Provider, ProviderQueue>();

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const grokKey = env.XAI_API_KEY?.trim() || env.GROK_API_KEY?.trim();
    this.apiKeys = {
      openai: env.OPENAI_API_KEY?.trim() || undefined,
      gemini: env.GEMINI_API_KEY?.trim() || undefined,
      grok: grokKey || undefined,
      anthropic: env.ANTHROPIC_API_KEY?.trim() || undefined,
      cloudflare: env.CF_TOKEN?.trim() && env.CF_ACCOUNT_ID?.trim() ? env.CF_TOKEN.trim() : undefined
    };
    this.cloudflareAccountId = env.CF_ACCOUNT_ID?.trim() || undefined;
    const requestedRate = Number(env.AI_REQUESTS_PER_MINUTE);
    this.requestsPerMinute = Number.isInteger(requestedRate) && requestedRate >= 1 && requestedRate <= 60
      ? requestedRate
      : 10;
  }

  async createChatCompletion(messages: ChatMessage[], options: GenerationOptions = {}): Promise<string | null> {
    const resolvedOptions = await this.resolveGenerationOptions(options);
    const { temperature = 1.0, max_tokens = 1000 } = resolvedOptions;
    const requestMessages = this.addStyleInstruction(messages, resolvedOptions.styleInstruction);
    return this.withProviderFallback(provider =>
      this.generateText(provider, requestMessages, { ...resolvedOptions, temperature, max_tokens })
    );
  }

  async createOpenAICompletion(messages: ChatMessage[], options: GenerationOptions = {}): Promise<string | null> {
    if (!this.apiKeys.openai) throw new Error('OPENAI_API_KEY is required for Luna media prompt generation');

    const resolvedOptions = await this.resolveGenerationOptions({ ...options, model: 'gpt-6-luna' });
    const { temperature = 1.0, max_tokens = 500 } = resolvedOptions;
    return this.withProviderRetries('openai', () =>
      this.enqueueProviderRequest('openai', () =>
        this.generateOpenAICompatible('openai', messages, {
          ...resolvedOptions,
          model: 'gpt-6-luna',
          temperature,
          max_tokens
        })
      )
    );
  }

  async generateImage(prompt: string): Promise<Buffer> {
    if (!this.apiKeys.openai) throw new Error('OPENAI_API_KEY is required for image generation');

    const imageBase64 = await this.withProviderRetries('openai', () =>
      this.enqueueProviderRequest('openai', async () => {
        const response = await fetchWithProviderTimeout(
          'OpenAI image generation',
          'https://api.openai.com/v1/images/generations',
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.apiKeys.openai}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-image-2.5-flare',
              prompt,
              size: '1024x1024',
              quality: 'medium',
              output_format: 'png'
            })
          },
          120_000
        );
        if (!response.ok) throw await providerHttpError('OpenAI image generation', response);
        const result = await response.json() as { data?: Array<{ b64_json?: string }> };
        const image = result.data?.[0]?.b64_json;
        if (!image) throw new Error('OpenAI returned no image data');
        return image;
      })
    );

    if (!imageBase64) throw new Error('OpenAI image generation returned an empty result');
    return Buffer.from(imageBase64, 'base64');
  }

  async editImage(prompt: string, imageUrl: string): Promise<Buffer> {
    if (!this.apiKeys.openai) throw new Error('OPENAI_API_KEY is required for image editing');

    let parsedImageUrl: URL;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      throw new Error('The selected image has an invalid URL');
    }
    if (parsedImageUrl.protocol !== 'https:') {
      throw new Error('The selected image must be available over HTTPS');
    }

    const imageBase64 = await this.withProviderRetries('openai', () =>
      this.enqueueProviderRequest('openai', async () => {
        const response = await fetchWithProviderTimeout(
          'OpenAI image editing',
          'https://api.openai.com/v1/images/edits',
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.apiKeys.openai}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-image-2.5-flare',
              images: [{ image_url: imageUrl }],
              prompt,
              size: '1024x1024',
              quality: 'medium',
              output_format: 'png'
            })
          },
          120_000
        );
        if (!response.ok) throw await providerHttpError('OpenAI image editing', response);
        const result = await response.json() as { data?: Array<{ b64_json?: string }> };
        const image = result.data?.[0]?.b64_json;
        if (!image) throw new Error('OpenAI returned no edited image data');
        return image;
      })
    );

    if (!imageBase64) throw new Error('OpenAI image editing returned an empty result');
    return Buffer.from(imageBase64, 'base64');
  }

  async generateSpeech(input: string, voice: string): Promise<Buffer> {
    if (!this.apiKeys.openai) throw new Error('OPENAI_API_KEY is required for speech generation');

    const audioBase64 = await this.withProviderRetries('openai', () =>
      this.enqueueProviderRequest('openai', async () => {
        const response = await fetchWithProviderTimeout(
          'OpenAI speech generation',
          'https://api.openai.com/v1/audio/speech',
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.apiKeys.openai}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini-tts',
              voice,
              input,
              instructions: 'Speak clearly and naturally, with a friendly conversational tone.',
              response_format: 'mp3'
            })
          },
          60_000
        );
        if (!response.ok) throw await providerHttpError('OpenAI speech generation', response);
        return Buffer.from(await response.arrayBuffer()).toString('base64');
      })
    );

    if (!audioBase64) throw new Error('OpenAI speech generation returned an empty result');
    return Buffer.from(audioBase64, 'base64');
  }

  async createVisionCompletion(
    systemPrompt: string,
    textPrompt: string,
    imageUrl: string,
    options: GenerationOptions = {}
  ): Promise<string | null> {
    const resolvedOptions = await this.resolveGenerationOptions(options);
    const { temperature = 1.0, max_tokens = 300 } = resolvedOptions;
    const messages: ChatMessage[] = this.addStyleInstruction([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: textPrompt }
    ], resolvedOptions.styleInstruction);
    let imageDataPromise: Promise<{ mimeType: string; data: string }> | undefined;

    return this.withProviderFallback(provider => {
      if (provider === 'gemini' || provider === 'anthropic' || provider === 'cloudflare') {
        imageDataPromise ??= this.downloadImage(imageUrl);
        if (provider === 'cloudflare') {
          return imageDataPromise.then(image => this.generateCloudflare(messages, { ...resolvedOptions, temperature, max_tokens }, image));
        }
        return imageDataPromise.then(image =>
          provider === 'gemini'
            ? this.generateGemini(messages, { ...resolvedOptions, temperature, max_tokens }, image)
            : this.generateAnthropic(messages, { ...resolvedOptions, max_tokens }, image)
        );
      }
      return this.generateOpenAICompatible(provider, messages, { ...resolvedOptions, temperature, max_tokens }, imageUrl);
    });
  }

  private async resolveGenerationOptions(options: GenerationOptions): Promise<GenerationOptions> {
    const { guildId, preserveExplicitTemperature = false, ...requestOptions } = options;
    const requestContext = (await import('./ai-context.js')).getAIRequestContext();
    const settingsGuildId = guildId ?? requestContext?.guildId ?? null;
    let temperature = requestOptions.temperature ?? 1.0;
    let max_tokens = requestOptions.max_tokens;
    let reasoning_effort = requestOptions.reasoning_effort ?? 'low';

    if (settingsGuildId) {
      const { prisma } = await import('./prisma.js');
      const settings = await prisma.dndServer.findUnique({
        where: { discordId: settingsGuildId },
        select: { id: true, aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true }
      });
      if (settings) {
        if (!preserveExplicitTemperature || requestOptions.temperature === undefined) {
          temperature = settings.aiTemperature;
        }
        max_tokens = settings.aiMaxTokens ?? max_tokens;
        reasoning_effort = settings.aiReasoningEffort as ReasoningEffort;
      } else {
        // Keep new servers on the same default shown by /ai-settings show.
        temperature = 1.0;
        reasoning_effort = 'low';
      }
      const styleProfile = settings && requestContext?.userId
        ? await prisma.userWritingStyle.findUnique({
            where: { serverId_discordUserId: { serverId: settings.id, discordUserId: requestContext.userId } },
            select: { profile: true }
          })
        : null;
      const profile = styleProfile ? this.formatStyleProfile(styleProfile.profile) : null;
      if (profile) requestOptions.styleInstruction = profile;
    }

    return { ...requestOptions, temperature, max_tokens, reasoning_effort };
  }

  private formatStyleProfile(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    const profile = value as Record<string, unknown>;
    const values = [
      profile.avgWordsPerSentence,
      profile.avgWordLength,
      profile.lowercaseSentenceStartRatio,
      profile.emojiPer100Words,
      profile.exclamationPer100Sentences,
      profile.questionPer100Sentences,
      profile.contractionPer100Words
    ];
    if (!values.every(item => typeof item === 'number' && Number.isFinite(item))) return null;
    const [sentenceLength, wordLength, lowercaseStarts, emojis, exclamations, questions, contractions] = values as number[];
    return `The requesting user opted into a writing-style preference. Match these broad style traits where natural: about ${Math.round(sentenceLength)} words per sentence; average word length ${wordLength.toFixed(1)} characters; ${Math.round(lowercaseStarts * 100)}% lowercase sentence openings; ${emojis.toFixed(1)} emoji per 100 words; ${exclamations.toFixed(1)} exclamation marks per 100 sentences; ${questions.toFixed(1)} question marks per 100 sentences; ${contractions.toFixed(1)} contractions per 100 words. Do not reuse wording or personal details from their samples.`;
  }

  private addStyleInstruction(messages: ChatMessage[], instruction?: string): ChatMessage[] {
    if (!instruction) return messages;
    const withStyle = messages.slice();
    const systemIndex = withStyle.findIndex(message => message.role === 'system');
    if (systemIndex >= 0) {
      withStyle[systemIndex] = { ...withStyle[systemIndex], content: `${withStyle[systemIndex].content}\n\n${instruction}` };
    } else {
      withStyle.unshift({ role: 'system', content: instruction });
    }
    return withStyle;
  }

  private async withProviderFallback(
    request: (provider: Provider) => Promise<string | null>
  ): Promise<string | null> {
    const providers = (['gemini', 'openai', 'cloudflare', 'grok', 'anthropic'] as Provider[])
      .filter(provider => this.apiKeys[provider]);

    if (providers.length === 0) {
      throw new Error('Set at least one AI provider key: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY, ANTHROPIC_API_KEY, or CF_TOKEN with CF_ACCOUNT_ID');
    }

    let lastError: unknown;
    const failures: string[] = [];
    for (const provider of providers) {
      try {
        const response = await this.withProviderRetries(provider, () =>
          this.enqueueProviderRequest(provider, () => request(provider))
        );
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

  private getProviderQueue(provider: Provider): ProviderQueue {
    let queue = this.providerQueues.get(provider);
    if (!queue) {
      queue = { jobs: [], starts: [], active: 0, nextAllowedAt: 0, blockedUntil: 0 };
      this.providerQueues.set(provider, queue);
    }
    return queue;
  }

  private enqueueProviderRequest(provider: Provider, run: () => Promise<string | null>): Promise<string | null> {
    const queue = this.getProviderQueue(provider);
    if (queue.jobs.length >= MAX_QUEUED_REQUESTS_PER_PROVIDER) {
      return Promise.reject(new Error(`${providerNames[provider]} request queue is full`));
    }
    return new Promise((resolve, reject) => {
      queue.jobs.push({ run, resolve, reject });
      this.pumpProviderQueue(provider, queue);
    });
  }

  private pumpProviderQueue(provider: Provider, queue: ProviderQueue): void {
    if (queue.timer || queue.active >= MAX_CONCURRENT_REQUESTS_PER_PROVIDER || !queue.jobs.length) return;
    const now = Date.now();
    queue.starts = queue.starts.filter(start => now - start < RATE_WINDOW_MS);
    const rateWindowAt = queue.starts.length >= this.requestsPerMinute
      ? queue.starts[0] + RATE_WINDOW_MS
      : 0;
    const allowedAt = Math.max(queue.nextAllowedAt, queue.blockedUntil, rateWindowAt);
    if (allowedAt > now) {
      queue.timer = setTimeout(() => {
        queue.timer = undefined;
        this.pumpProviderQueue(provider, queue);
      }, allowedAt - now);
      return;
    }

    const job = queue.jobs.shift();
    if (!job) return;
    queue.starts.push(now);
    queue.nextAllowedAt = now + RATE_WINDOW_MS / this.requestsPerMinute;
    queue.active += 1;
    void job.run()
      .then(job.resolve, job.reject)
      .finally(() => {
        queue.active -= 1;
        this.pumpProviderQueue(provider, queue);
      });
    this.pumpProviderQueue(provider, queue);
  }

  private async withProviderRetries<T>(provider: Provider, request: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        const status = errorStatus(error);
        const retryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
        if (!retryable || attempt >= MAX_TRANSIENT_RETRIES) throw error;
        const delay = errorRetryAfter(error) ?? RETRY_DELAYS_MS[attempt];
        const queue = this.getProviderQueue(provider);
        queue.blockedUntil = Math.max(queue.blockedUntil, Date.now() + delay);
        logger.warn(`${providerNames[provider]} returned HTTP ${status}; retry ${attempt + 1}/${MAX_TRANSIENT_RETRIES} after ${Math.ceil(delay / 1000)}s`);
      }
    }
  }

  private async generateText(
    provider: Provider,
    messages: ChatMessage[],
    options: GenerationOptions
  ): Promise<string | null> {
    if (provider === 'gemini') return this.generateGemini(messages, options);
    if (provider === 'anthropic') return this.generateAnthropic(messages, options);
    if (provider === 'cloudflare') return this.generateCloudflare(messages, options);
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
      timeout: PROVIDER_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
      ...(provider === 'grok' ? { baseURL: 'https://api.x.ai/v1' } : {})
    });
    const model = provider === 'grok' ? 'grok-4.7' : options.model || 'gpt-6-luna';
    const reasoningEffort = provider === 'openai' ? options.reasoning_effort ?? 'low' : undefined;
    // GPT-6 only accepts temperature when reasoning effort is none.
    const temperature = provider === 'openai' && reasoningEffort !== 'none' ? undefined : options.temperature;
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
    const response = await fetchWithProviderTimeout('Gemini', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
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
    if (!response.ok) throw await providerHttpError('Gemini', response);
    const result = await response.json() as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('Gemini stopped at the output token limit; its response was incomplete');
    }
    return candidate?.content?.parts?.map(part => part.text || '').join('') || null;
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
    const response = await fetchWithProviderTimeout('Anthropic', 'https://api.anthropic.com/v1/messages', {
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
    if (!response.ok) throw await providerHttpError('Anthropic', response);
    const result = await response.json() as { stop_reason?: string; content?: Array<{ type?: string; text?: string }> };
    if (result.stop_reason === 'max_tokens') {
      throw new Error('Claude stopped at the output token limit; its response was incomplete');
    }
    return result.content?.filter(part => part.type === 'text').map(part => part.text || '').join('') || null;
  }

  private async generateCloudflare(
    messages: ChatMessage[],
    options: GenerationOptions,
    image?: { mimeType: string; data: string }
  ): Promise<string | null> {
    if (!this.cloudflareAccountId) throw new Error('CF_ACCOUNT_ID is required with CF_TOKEN');

    const model = image
      ? '@cf/meta/llama-3.2-11b-vision-instruct'
      : options.model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    const prompt = [
      messages.find(message => message.role === 'system')?.content,
      ...messages.filter(message => message.role !== 'system').map(message => `${message.role}: ${message.content}`)
    ].filter(Boolean).join('\n\n');
    const response = await fetchWithProviderTimeout('Cloudflare Workers AI', `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.cloudflareAccountId)}/ai/run/${model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKeys.cloudflare!}`, 'content-type': 'application/json' },
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

  private async downloadImage(imageUrl: string): Promise<{ mimeType: string; data: string }> {
    const response = await fetchWithProviderTimeout('Image download', imageUrl);
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
