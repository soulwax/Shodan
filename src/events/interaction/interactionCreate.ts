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

// File: src/events/interaction/interactionCreate.ts



import { Collection, Events, Interaction } from 'discord.js';
import { ExtendedClient } from '../../types/client';
import { Event } from '../../types/event';
import { logger } from '../../utils/logger';

// commandName -> userId -> expiry timestamp (ms)
const cooldowns = new Collection<string, Collection<string, number>>();

const interactionCreateEvent: Event = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction & { client: ExtendedClient }) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command ${interaction.commandName} not found`);
      return;
    }

    // Cooldown enforcement
    if (command.cooldown) {
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      const timestamps = cooldowns.get(command.data.name)!;
      const userId = interaction.user.id;
      const now = Date.now();
      const cooldownMs = command.cooldown * 1000;

      const expiry = timestamps.get(userId);
      if (expiry && now < expiry) {
        const remaining = ((expiry - now) / 1000).toFixed(1);
        await interaction.reply({
          content: `Please wait **${remaining}s** before using \`/${command.data.name}\` again.`,
          ephemeral: true
        });
        return;
      }

      timestamps.set(userId, now + cooldownMs);
      // Clean up the entry once the cooldown expires to avoid memory growth
      setTimeout(() => timestamps.delete(userId), cooldownMs);
    }

    try {
      await command.execute(interaction, interaction.client);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);

      const errorMessage = 'There was an error while executing this command!';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};

export default interactionCreateEvent;