import { providerNames } from '../../config/ai';
import { logger } from '../../utils/logger';
import { errorRetryAfter, errorStatus } from './http';
import type { Provider } from '../../types/ai';

type ProviderJob = {
  run: () => Promise<void>;
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

/** Owns pacing, bounded queues, and retry cooldowns for all provider requests. */
export class ProviderRequestScheduler {
  private readonly providerQueues = new Map<Provider, ProviderQueue>();

  constructor(private readonly requestsPerMinute: number) {}

  private getProviderQueue(provider: Provider): ProviderQueue {
    let queue = this.providerQueues.get(provider);
    if (!queue) {
      queue = { jobs: [], starts: [], active: 0, nextAllowedAt: 0, blockedUntil: 0 };
      this.providerQueues.set(provider, queue);
    }
    return queue;
  }

  private enqueueProviderRequest<T>(provider: Provider, run: () => Promise<T>): Promise<T> {
    const queue = this.getProviderQueue(provider);
    if (queue.jobs.length >= MAX_QUEUED_REQUESTS_PER_PROVIDER) {
      return Promise.reject(new Error(`${providerNames[provider]} request queue is full`));
    }
    return new Promise((resolve, reject) => {
      queue.jobs.push({ run: async () => {
        try {
          resolve(await run());
        } catch (error) {
          reject(error);
        }
      } });
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
      .finally(() => {
        queue.active -= 1;
        this.pumpProviderQueue(provider, queue);
      });
    this.pumpProviderQueue(provider, queue);
  }

  async run<T>(provider: Provider, request: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.enqueueProviderRequest(provider, request);
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

}
