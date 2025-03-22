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

// File: src/config/environment.ts


import dotenv from 'dotenv'
import { z } from 'zod'
import { logger } from '../utils/logger'

// Define environment variable schema
const envSchema = z.object({
  BOT_TOKEN: z.string(),
  CLIENT_ID: z.string(),
  TRACKING_CHANNEL_ID: z.string(),
  LANGUAGE_CHANNEL_ID: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
})

type EnvVariables = z.infer<typeof envSchema>

/**
 * Loads and validates environment variables
 */
export function loadEnvironment(): EnvVariables {
  dotenv.config()

  try {
    // Validate environment variables
    const env = envSchema.parse(process.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (error instanceof z.ZodError) {
        logger.error('Invalid environment variables:', error.format())
      }
    }
    throw error
  }
}

/**
 * Gets a validated environment variable
 */
export function getEnv<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
  return loadEnvironment()[key]
}