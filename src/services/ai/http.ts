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

export const PROVIDER_REQUEST_TIMEOUT_MS = 30_000;

export class ProviderHttpError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

export function errorStatus(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
}

export function errorRetryAfter(error: unknown): number | undefined {
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

export async function providerHttpError(provider: string, response: Response): Promise<ProviderHttpError> {
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

export async function fetchWithProviderTimeout(
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

export async function downloadImage(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  const maxBytes = 10 * 1024 * 1024;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`Unable to fetch image (HTTP ${response.status})`);
    const mimeType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
    if (!mimeType || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error('Unsupported image format');
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error('Image is larger than 10 MB');
    }
    if (!response.body) throw new Error('Image response had no body');

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let chunk = await reader.read();
    while (!chunk.done) {
      const value = chunk.value;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Image is larger than 10 MB');
      }
      chunks.push(value);
      chunk = await reader.read();
    }
    return { mimeType, data: Buffer.concat(chunks).toString('base64') };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Image download timed out after ${PROVIDER_REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
