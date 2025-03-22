// File: src/services/prisma.ts

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// Create a global prisma instance
const prisma = new PrismaClient({
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

// Set up logging for Prisma events
prisma.$on('query', (e: { query: any }) => {
  logger.debug(`Query: ${e.query}`)
})

prisma.$on('error', (e: { message: any }) => {
  logger.error(`Prisma error: ${e.message}`)
})

prisma.$on('info', (e: { message: any }) => {
  logger.info(`Prisma info: ${e.message}`)
})

prisma.$on('warn', (e: { message: any }) => {
  logger.warn(`Prisma warning: ${e.message}`)
})

/**
 * Initialize the Prisma connection
 */
export async function initPrisma(): Promise<void> {
  try {
    // Test connection with a simple query
    await prisma.$connect()
    logger.info('Successfully connected to database with Prisma')

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
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Prisma connection closed')
}

// Export the prisma client to be used throughout the application
export { prisma }
