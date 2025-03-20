// src/core/events.ts

import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Event } from '../types/event';
import { logger } from '../utils/logger';

/**
 * Registers all event handlers
 */
export function registerEvents(client: Client) {
  // Get all event category folders
  const eventFolders = fs.readdirSync(path.join(__dirname, '../events'));
  
  for (const folder of eventFolders) {
    // Skip files, only process directories
    if (!fs.statSync(path.join(__dirname, '../events', folder)).isDirectory()) continue;
    
    // Get all event files from the folder
    const eventFiles = fs.readdirSync(path.join(__dirname, '../events', folder))
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    
    for (const file of eventFiles) {
      try {
        // Import the event module
        const eventPath = path.join(__dirname, '../events', folder, file);
        const event: Event = require(eventPath).default;
        
        // Register the event
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        
        logger.info(`Registered event: ${event.name}`);
      } catch (error) {
        logger.error(`Error loading event from file ${file}:`, error);
      }
    }
  }
}