// File: src/types/client.ts

import { Client, Collection } from 'discord.js';
import { Command } from './command';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
    }
}