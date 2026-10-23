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
