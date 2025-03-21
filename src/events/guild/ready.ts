import { Client, Events } from 'discord.js';
import { Event } from '../../types/event';
import { logger } from '../../utils/logger';

const readyEvent: Event = {
  name: Events.ClientReady,
  once: true,
  
  execute(client: Client) {
    const asciiArt = `
    ███████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ██╗
    ██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗  ██║
    ███████╗███████║██║   ██║██║  ██║███████║██╔██╗ ██║
    ╚════██║██╔══██║██║   ██║██║  ██║██╔══██║██║╚██╗██║
    ███████║██║  ██║╚██████╔╝██████╔╝██║  ██║██║ ╚████║
    ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
    `;
    
    console.log(asciiArt);
    logger.info(`Successfully logged in as ${client.user?.tag}`);
    logger.info(`Bot is active in ${client.guilds.cache.size} servers`);
  }
};

export default readyEvent;