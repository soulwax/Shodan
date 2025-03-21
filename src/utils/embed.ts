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