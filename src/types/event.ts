// File: src/types/event.ts

import { ClientEvents } from "discord.js";

export interface Event<K extends keyof ClientEvents = any> {
  name: K;
  once: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}