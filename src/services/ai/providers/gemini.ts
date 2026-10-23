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

import { fetchWithProviderTimeout, providerHttpError } from '../http';
import type { ChatMessage, ImageData, ProviderGenerationOptions } from '../../../types/ai';

export async function generateGemini(
  apiKey: string,
  messages: ChatMessage[],
  options: ProviderGenerationOptions,
  image?: ImageData
): Promise<string | null> {
  const conversation = messages.filter(message => message.role !== 'system');
  const lastUserIndex = conversation.map(message => message.role).lastIndexOf('user');
  const contents = conversation
    .map((message, index) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [
        { text: message.content },
        ...(image && index === lastUserIndex
          ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }]
          : [])
      ]
    }));
  const systemInstruction = messages.find(message => message.role === 'system')?.content;
  const response = await fetchWithProviderTimeout('Gemini', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
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

