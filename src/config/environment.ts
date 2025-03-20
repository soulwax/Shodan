// File: src/config/environment.ts


import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Define environment variable schema
const envSchema = z.object({
  BOT_TOKEN: z.string(),
  CLIENT_ID: z.string(),
  TRACKING_CHANNEL_ID: z.string(),
  LANGUAGE_CHANNEL_ID: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

type EnvVariables = z.infer<typeof envSchema>;

/**
 * Loads and validates environment variables
 */
export function loadEnvironment(): EnvVariables {
  dotenv.config();
  
  try {
    // Validate environment variables
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Invalid environment variables:', error.format());
      throw new Error('Invalid environment configuration, check logs for details');
    }
    throw error;
  }
}

/**
 * Gets a validated environment variable
 */
export function getEnv<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
  return loadEnvironment()[key];
}