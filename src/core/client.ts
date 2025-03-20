// File: src/core/client.ts

import { Client, GatewayIntentBits } from "discord.js";


export function setupDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });
}