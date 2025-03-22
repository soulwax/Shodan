// File: src/app.ts

import dotenv from 'dotenv'
import { setupDiscordClient } from './core/client'
import { registerCommands } from './core/commands'
import { registerEvents } from './core/events'
import { initPrisma } from './services/prisma' // Import Prisma init
import { logger } from './utils/logger'

// Initialize environment variables
dotenv.config()

/**
 * Bootstrap the application
 */
async function bootstrap() {
  try {
    logger.info('Starting Shodan Discord Bot...')

    // Initialize Prisma
    logger.info('Connecting to database with Prisma...')
    await initPrisma()

    // Setup Discord client
    const client = setupDiscordClient()

    // Register commands
    await registerCommands(client)

    // Register events
    registerEvents(client)

    // Login to Discord
    await client.login(process.env.BOT_TOKEN)

    logger.info('Shodan Discord Bot started successfully')
  } catch (error) {
    logger.error('Failed to start the bot', error)
    process.exit(1)
  }
}

// Export the bootstrap function as the default export
export default bootstrap
