// File: src/core/commands.ts


import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { ExtendedClient } from '../types/client';
import { Command } from '../types/command';
import { logger } from '../utils/logger';

/**
 * Registers all commands with Discord API
 */
export async function registerCommands(client: ExtendedClient): Promise<void> {
  logger.info('Registering commands...');
  
  const commands: Command[] = [];
  const commandsDir = path.join(__dirname, '../commands');
  
  // Process both JavaScript files in the root commands directory
  // and TypeScript files in category subdirectories
  try {
    // First, load legacy JS commands from the root commands directory
    if (fs.existsSync(commandsDir)) {
      const legacyCommandFiles = fs.readdirSync(commandsDir)
        .filter(file => file.endsWith('.js') && file !== 'index.js');
      
      for (const file of legacyCommandFiles) {
        try {
          const filePath = path.join(commandsDir, file);
          // Use dynamic import for consistency
          const command = require(filePath);
          
          if (command?.data) {
            logger.info(`Registering legacy command: ${command.data.name || 'Unknown'}`);
            client.commands.set(command.data.name, command);
            commands.push(command);
          } else {
            logger.warn(`Legacy command at ${filePath} is missing required properties`);
          }
        } catch (error) {
          logger.error(`Error loading legacy command file ${file}:`, error);
        }
      }
    }
    
    // Then, load TypeScript commands from category directories
    const commandFolders = ['utility', 'moderation', 'fun', 'tarot'];
    
    for (const folder of commandFolders) {
      const folderPath = path.join(commandsDir, folder);
      
      // Skip if folder doesn't exist yet
      if (!fs.existsSync(folderPath)) {
        logger.warn(`Command folder ${folder} does not exist, skipping`);
        continue;
      }
      
      const commandFiles = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      for (const file of commandFiles) {
        try {
          const filePath = path.join(folderPath, file);
          // Need to use require for CommonJS compatibility
          const command = require(filePath).default;
          
          if (!command?.data || !command?.execute) {
            logger.warn(`Command at ${filePath} is missing required properties`);
            continue;
          }
          
          logger.info(`Registering command: ${command.data.name || 'Unknown'}`);
          client.commands.set(command.data.name, command);
          commands.push(command);
        } catch (error) {
          logger.error(`Error loading command file ${file}:`, error);
        }
      }
    }
    
    // Register with Discord API if there are commands to register
    if (commands.length > 0) {
      try {
        logger.info(`Started refreshing ${commands.length} application (/) commands...`);
        
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN || '');
        
        // Convert command data to JSON before sending to Discord API
        const commandsJson = commands.map(cmd => {
          // Check if data is SlashCommandBuilder instance
          return cmd.data instanceof SlashCommandBuilder ? cmd.data.toJSON() : cmd.data;
        });
        
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID || ''),
          { body: commandsJson }
        );
        
        logger.info(`Successfully registered ${commands.length} application commands`);
      } catch (error) {
        logger.error('Failed to register application commands:', error);
      }
    } else {
      logger.warn('No commands found to register');
    }
  } catch (error) {
    logger.error('Error loading commands:', error);
  }
}