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

// File: src/utils/embed.ts



import { EmbedBuilder } from 'discord.js';

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor('#ff0000');
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor('#00ff00');
}

export function createInfoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor('#0099ff');
}

export const embedTemplates = {
  ping: (ping: number) => {
    return new EmbedBuilder()
      .setTitle('Pong!')
      .setDescription(`${ping}ms`)
      .setColor('#00ffab');
  },
  
  error: {
    noVoiceChannel: () => {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription('I couldn\'t find a voice channel.')
        .setColor('#ff0000');
    },
    
    mentionUser: () => {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please mention a user.')
        .setColor('#ff0000');
    },
    
    admin: () => {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription('You don\'t have the permission to do that or the options were not set correctly.')
        .setColor('#ff0000');
    }
  },
  
  avatar: (userName: string, userAvatar: string) => {
    return new EmbedBuilder()
      .setTitle(`${userName}'s Avatar`)
      .setDescription(`[Link to avatar](${userAvatar})`)
      .setImage(userAvatar)
      .setColor('#0099ff');
  },
  
  echo: (description: string) => {
    return new EmbedBuilder()
      .setTitle('Echo')
      .setDescription(description)
      .setColor('#00ff00');
  }
};