// File: src/events/guild/ready.ts

import { Client, Events } from 'discord.js';
import { Event } from '../../types/event';
import { logger } from '../../utils/logger';

const readyEvent: Event = {
  name: Events.ClientReady,
  once: true,
  
  execute(client: Client) {
    logger.info(`Logged in as ${client.user?.tag}!`);
  }
};

export default readyEvent;