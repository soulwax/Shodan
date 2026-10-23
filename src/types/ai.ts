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
