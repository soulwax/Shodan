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

// File: src/events/guild/ready.ts

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