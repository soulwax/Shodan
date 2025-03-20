<!-- File: src/events/interaction/interactionCreate.ts -->

// src/events/interaction/interactionCreate.ts

import { Events, Interaction } from 'discord.js';
import { Event } from '../../types/event';
import { logger } from '../../utils/logger';

const interactionCreateEvent: Event = {
  name: Events.InteractionCreate,
  once: false,
  
  async execute(interaction: Interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        logger.warn(`Command ${interaction.commandName} not found`);
        return;
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
  }
};

export default interactionCreateEvent;