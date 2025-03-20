// File: src/app.ts

import { loadEnvironment } from './config/environment';
import { setupDiscordClient } from './core/client';
import { registerCommands } from './core/commands';
import { registerEvents } from './core/events';
import { setupLogger } from './utils/logger';

async function bootstrap() {
  // Setup logger
  const logger = setupLogger();
  
  // Load environment variables
  loadEnvironment();
  
  // Setup Discord client
  const client = setupDiscordClient();
  
  try {
    // Register commands
    await registerCommands(client);
    logger.info('Commands registered successfully');
    
    // Register events
    registerEvents(client);
    logger.info('Events registered successfully');
    
    // Login to Discord
    await client.login(process.env.BOT_TOKEN);
    logger.info(`Logged in as ${client.user?.tag}`);
  } catch (error) {
    logger.error('Failed to start the bot', error);
    process.exit(1);
  }
}

export default bootstrap;