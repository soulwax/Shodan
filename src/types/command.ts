// src/types/command.ts

import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<void>;
  category?: string; // For organizing commands in help menus
  cooldown?: number; // Cooldown in seconds
}