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

// File: src/core/client.ts



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
  
  // Initialize the commands collection
  client.commands = new Collection();
  
  return client;
}