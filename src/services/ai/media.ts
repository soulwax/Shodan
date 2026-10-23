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

import { fetchWithProviderTimeout, providerHttpError } from './http'

export async function generateImage(
  apiKey: string,
  prompt: string
): Promise<Buffer> {
  const response = await fetchWithProviderTimeout(
    'OpenAI image generation',
    'https://api.openai.com/v1/images/generations',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
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
  )
  if (!response.ok)
    throw await providerHttpError('OpenAI image generation', response)
  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>
  }
  const image = result.data?.[0]?.b64_json
  if (!image) throw new Error('OpenAI returned no image data')
  return Buffer.from(image, 'base64')
}

export async function editImage(
  apiKey: string,
  prompt: string,
  imageUrl: string
): Promise<Buffer> {
  const response = await fetchWithProviderTimeout(
    'OpenAI image editing',
    'https://api.openai.com/v1/images/edits',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
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
  )
  if (!response.ok)
    throw await providerHttpError('OpenAI image editing', response)
  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>
  }
  const image = result.data?.[0]?.b64_json
  if (!image) throw new Error('OpenAI returned no edited image data')
  return Buffer.from(image, 'base64')
}

export async function generateSpeech(
  apiKey: string,
  input: string,
  voice: string,
  instructions: string
): Promise<Buffer> {
  const response = await fetchWithProviderTimeout(
    'OpenAI speech generation',
    'https://api.openai.com/v1/audio/speech',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions,
        response_format: 'mp3'
      })
    },
    60_000
  )
  if (!response.ok)
    throw await providerHttpError('OpenAI speech generation', response)
  const audio = Buffer.from(await response.arrayBuffer())
  if (!audio.length)
    throw new Error('OpenAI speech generation returned an empty result')
  return audio
}

export function validateImageUrl(imageUrl: string): void {
  let parsedImageUrl: URL
  try {
    parsedImageUrl = new URL(imageUrl)
  } catch {
    throw new Error('The selected image has an invalid URL')
  }
  if (parsedImageUrl.protocol !== 'https:') {
    throw new Error('The selected image must be available over HTTPS')
  }
}
