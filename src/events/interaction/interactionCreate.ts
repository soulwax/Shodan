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
import { Command, MessageContextCommand } from '../../types/command';
import { Event } from '../../types/event';
import { withAIRequestContext } from '../../services/ai-context';
import { logger } from '../../utils/logger';
import { handleImageRemixModal, isImageRemixModal } from '../../commands/fun/remix-image-message';
import { handleJournalCaptureModal, isJournalCaptureModal } from '../../commands/dnd/save-to-journal';

// commandName -> userId -> expiry timestamp (ms)
const cooldowns = new Collection<string, Collection<string, number>>();

const interactionCreateEvent: Event = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction & { client: ExtendedClient }) {
    if (interaction.isModalSubmit()) {
      if (isImageRemixModal(interaction.customId)) {
        await withAIRequestContext(interaction.guildId, interaction.user.id, () =>
          handleImageRemixModal(interaction)
        );
      } else if (isJournalCaptureModal(interaction.customId)) {
        await withAIRequestContext(interaction.guildId, interaction.user.id, () =>
          handleJournalCaptureModal(interaction)
        );
      }
      return;
    }

    if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

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
      const commandLabel = interaction.isChatInputCommand()
        ? `/${command.data.name}`
        : `Apps > ${command.data.name}`;

      const expiry = timestamps.get(userId);
      if (expiry && now < expiry) {
        const remaining = ((expiry - now) / 1000).toFixed(1);
        await interaction.reply({
          content: `Please wait **${remaining}s** before using \`${commandLabel}\` again.`,
          ephemeral: true
        });
        return;
      }

      const nextExpiry = now + cooldownMs;
      timestamps.set(userId, nextExpiry);
      // Clean up the entry once the cooldown expires to avoid memory growth
      setTimeout(() => {
        // An older timer must not erase a newer cooldown for the same user.
        if (timestamps.get(userId) === nextExpiry) timestamps.delete(userId);
      }, cooldownMs);
    }

    await withAIRequestContext(interaction.guildId, interaction.user.id, async () => {
      try {
        if (interaction.isChatInputCommand()) {
          await (command as Command).execute(interaction, interaction.client);
        } else {
          await (command as MessageContextCommand).execute(interaction, interaction.client);
        }
      } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);

        const errorMessage = 'There was an error while executing this command!';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    });
  }
};

export default interactionCreateEvent;
