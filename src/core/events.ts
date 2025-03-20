// File: src/core/events.ts

import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Event } from '../types/event';
import { logger } from '../utils/logger';

/**
 * Registers all event handlers
 */
export function registerEvents(client: Client): void {
  logger.info('Registering events...');
  
  const eventFolders = ['guild', 'interaction', 'voice'];
  
  for (const folder of eventFolders) {
    const folderPath = path.join(__dirname, '../events', folder);
    
    // Skip if folder doesn't exist yet
    if (!fs.existsSync(folderPath)) {
      logger.warn(`Event folder ${folder} does not exist, skipping`);
      continue;
    }
    
    const eventFiles = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    
    for (const file of eventFiles) {
      try {
        const filePath = path.join(folderPath, file);
        // Need to use require for CommonJS compatibility
        const event: Event = require(filePath).default;
        
        if (!event?.name || !event?.execute) {
          logger.warn(`Event at ${filePath} is missing required properties`);
          continue;
        }
        
        logger.info(`Registering event: ${event.name}`);
        
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
      } catch (error) {
        logger.error(`Error loading event file ${file}:`, error);
      }
    }
  }
  
  logger.info('Event registration complete');
}