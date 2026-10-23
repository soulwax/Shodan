import type { PersonaProfile } from '../data/personas';

export type Provider = 'openai' | 'gemini' | 'grok' | 'anthropic' | 'cloudflare';
export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type DisassociationMode = 'random' | 'server' | 'none';
export type GenerationOptions = {
  provider?: Provider | 'auto';
  model?: string;
  temperature?: number;
  max_tokens?: number;
  reasoning_effort?: ReasoningEffort;
  guildId?: string | null;
  styleInstruction?: string;
  preserveExplicitTemperature?: boolean;
  /** Defaults to random. Use server to apply the saved persona, or none to suppress injection. */
  disassociation?: DisassociationMode;
  personaPurpose?: 'delivery' | 'visual';
};
export type ProviderGenerationOptions = Omit<GenerationOptions, 'disassociation' | 'personaPurpose' | 'guildId' | 'preserveExplicitTemperature'>;
export type ResolvedGenerationOptions = {
  options: ProviderGenerationOptions;
  persona: PersonaProfile | null;
};

export type ImageData = { mimeType: string; data: string };

export interface AIConfiguration {
  apiKeys: Partial<Record<Provider, string>>;
  cloudflareAccountId?: string;
  requestsPerMinute: number;
}
