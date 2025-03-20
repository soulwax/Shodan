// File: src/types/client.ts

import { Collection } from 'discord.js';
import { ExtendedClient as BaseClient } from '../types/client';
import { Command } from '../types/command';
export interface ExtendedClient extends BaseClient {
  commands: Collection<string, Command>;
}

import { Client } from 'discord.js';

export function setupDiscordClient() {
  const client = new Client({
    intents: [] // your intents here
  }) as ExtendedClient;
  return client;
}