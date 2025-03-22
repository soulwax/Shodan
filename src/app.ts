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