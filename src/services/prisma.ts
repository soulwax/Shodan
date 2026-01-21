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

// File: src/services/prisma.ts
//
// Prisma v7 service with PostgreSQL
// Full Prisma v7 support enabled with PostgreSQL database

import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { logger } from '../utils/logger'

// Prisma v7 requires an adapter - using PostgreSQL adapter
// Environment variables are loaded in index.ts before this module is imported

// Get connection string from environment (loaded by dotenv in index.ts)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL environment variable is required')
}

// Initialize the PostgreSQL adapter with the connection string
const adapter = new PrismaPg({ connectionString })

// Create Prisma client instance
// Prisma v7: Auto-connects on first query, $connect() is optional
// Using PostgreSQL adapter for direct database connection
const prisma = new PrismaClient({
  adapter: adapter as any, // Type assertion: PrismaPg is compatible but types need alignment
  log: [
    {
      emit: 'event',
      level: 'query'
    },
    {
      emit: 'event',
      level: 'error'
    },
    {
      emit: 'event',
      level: 'info'
    },
    {
      emit: 'event',
      level: 'warn'
    }
  ]
})

// Set up logging for Prisma events (v7 compatible)
// Event types are more strictly typed in v7
prisma.$on('query', (e: Prisma.QueryEvent) => {
  logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`)
})

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error(`Prisma error: ${e.message}`)
})

prisma.$on('info', (e: Prisma.LogEvent) => {
  logger.info(`Prisma info: ${e.message}`)
})

prisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn(`Prisma warning: ${e.message}`)
})

/**
 * Initialize the Prisma connection
 * 
 * In Prisma v7, $connect() is optional as the client auto-connects.
 * We still call it explicitly to verify the connection and handle errors early.
 */
export async function initPrisma(): Promise<void> {
  try {
    // In v7, $connect() is optional but we call it to test the connection
    // The client will auto-connect on first query if not called explicitly
    await prisma.$connect()
    logger.info('Successfully connected to PostgreSQL database with Prisma v7')

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await disconnectPrisma()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      await disconnectPrisma()
      process.exit(0)
    })
  } catch (error) {
    logger.error('Failed to connect to database with Prisma:', error)
    throw error
  }
}

/**
 * Disconnect Prisma client
 * 
 * In v7, this is still required for graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Prisma connection closed')
}

// Export the prisma client to be used throughout the application
export { prisma }
