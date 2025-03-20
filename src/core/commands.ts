// File: src/core/commands.ts

import { Client, Collection, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Command } from '../types/command';
import { logger } from '../utils/logger';

// Create a new collection to store commands
const commands = new Collection<string, Command>();

/**
 * Registers all commands with Discord API
 */
export async function registerCommands(client: Client) {
  const commandsArray = [];
  
  // Get all command category folders
  const commandFolders = fs.readdirSync(path.join(__dirname, '../commands'));
  
  for (const folder of commandFolders) {
    // Skip files, only process directories
    if (!fs.statSync(path.join(__dirname, '../commands', folder)).isDirectory()) continue;
    
    // Get all command files from the folder
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands', folder))
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    
    for (const file of commandFiles) {
      try {
        // Import the command module
        const commandPath = path.join(__dirname, '../commands', folder, file);
        const command = require(commandPath).default;
        
        // Validate command structure
        if (!command.data || !command.execute) {
          logger.warn(`Command at ${commandPath} is missing required properties`);
          continue;
        }
        
        // Add to commands collection and array
        commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
        logger.info(`Registered command: ${command.data.name}`);
      } catch (error) {
        logger.error(`Error loading command from file ${file}:`, error);
      }
    }
  }
  
  // Register commands with Discord API
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  
  try {
    logger.info(`Started refreshing ${commandsArray.length} application commands`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commandsArray }
    );
    logger.info(`Successfully registered ${commandsArray.length} application commands`);
  } catch (error) {
    logger.error('Failed to register application commands', error);
    throw error;
  }
  
  // Add commands to client for interaction handling
  client.commands = commands;
}