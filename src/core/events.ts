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