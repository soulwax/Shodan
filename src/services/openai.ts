// File: src/services/openai.ts

import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

/**
 * OpenAI service for interacting with the OpenAI API
 */
export class OpenAIService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey
    });
    logger.info('OpenAI service initialized');
  }
  
  /**
   * Generate a completion using the OpenAI API
   */
  async createChatCompletion(
    messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
    options: {
      model?: string,
      temperature?: number,
      max_tokens?: number
    } = {}
  ) {
    try {
      const { model = 'gpt-4-1106-preview', temperature = 0.7, max_tokens = 1000 } = options;
      
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating OpenAI completion:', error);
      throw new Error('Failed to generate AI response');
    }
  }
}

let openAIService: OpenAIService | null = null;

/**
 * Get the OpenAI service instance (singleton)
 */
export function getOpenAIService(): OpenAIService {
  if (!openAIService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openAIService = new OpenAIService(apiKey);
  }
  
  return openAIService;
}