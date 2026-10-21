import { AsyncLocalStorage } from 'node:async_hooks';

type AIRequestContext = { guildId: string | null; userId: string };
const aiRequestContext = new AsyncLocalStorage<AIRequestContext>();

/** Carry server and requesting-user scope into AI calls made by a command. */
export function withAIRequestContext<T>(guildId: string | null, userId: string, run: () => Promise<T>): Promise<T> {
  return aiRequestContext.run({ guildId, userId }, run);
}

export function getAIRequestContext(): AIRequestContext | null {
  return aiRequestContext.getStore() ?? null;
}
