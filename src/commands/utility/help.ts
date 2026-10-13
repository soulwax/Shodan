// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../core/client';
import { Command } from '../../types/command';

const descriptions: Record<string, string> = {
  avatar: 'Show a member’s avatar.',
  balance: 'Check your five server campaign coin balances.',
  banned: 'List members banned from this server.',
  character: 'Use `/character init`, `read`, `ask`, `remember`, `change`, or `hp` for your saved sheet.',
  coinflip: 'Flip a coin.',
  compliment: 'Send yourself or someone else an AI generated compliment.',
  describe: 'Narrate an upload with `/describe`, or right-click an image post and choose Apps → Describe image.',
  dice: 'Roll several random values within a range.',
  divine: 'Draw a tarot card and get a reading.',
  echo: 'Repeat a message.',
  encounter: 'Start with `start`; players use `join` to roll from their saved Dexterity and enter initiative. Use `add` for foes, then `next`, `status`, `damage`, `heal`, `remove`, `twist`, or `end`.',
  example: 'Show a sample embed.',
  fortune: 'Get a lighthearted fortune.',
  help: 'Show this command guide.',
  join: 'Join your current voice channel (no music playback).',
  members: 'List members of this server.',
  npc: 'Generate a campaign aware NPC; `save:true` adds it to the journal.',
  ping: 'Check bot response time.',
  purge: 'Delete up to 100 recent messages.',
  'purge-char': 'Erase your saved character and notes for this server.',
  quest: 'Generate a campaign aware quest; `save:true` adds it to the journal.',
  roll: 'Roll dice using notation such as `2d6`.',
  roast: 'Ask for a playful roast.',
  ship: 'Get a playful compatibility read for two names.',
  story: 'Use `add`, `recent`, `search`, `show`, `edit`, `delete`, `ask`, `interpret`, `big-picture`, or `recap` for the typed journal and connected campaign memory.',
  store: 'Deposit coins, for example `coins:20sp 10gp 5e`.',
  withdraw: 'Withdraw coins using the same notation as `/store`.'
};

const groups: Array<{ name: string; commands: string[] }> = [
  { name: '🧭 D&D · Character & journal', commands: ['character', 'purge-char', 'story'] },
  { name: '⚔️ D&D · Encounters & bank', commands: ['encounter', 'quest', 'npc', 'store', 'withdraw', 'balance'] },
  { name: '🔮 Tarot', commands: ['divine'] },
  { name: '🎲 Fun & AI', commands: ['roll', 'dice', 'coinflip', 'describe', 'roast', 'compliment', 'fortune', 'ship'] },
  { name: '🛠️ Server utilities', commands: ['avatar', 'echo', 'ping', 'join', 'help', 'example'] },
  { name: '🛡️ Moderation', commands: ['purge', 'banned', 'members'] }
];

const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse Shodan’s commands and D&D tools.'),
  category: 'utility',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const available = new Set(client.commands.keys());
    const embed = new EmbedBuilder()
      .setTitle('Shodan · Command guide')
      .setDescription('Pick a slash command to see its options. D&D campaign tools are scoped to this server.')
      .setColor(0x15999f)
      .setAuthor({
        name: client.user?.tag || 'Shodan Bot',
        iconURL: client.user?.displayAvatarURL({ size: 256 })
      });

    const listed = new Set<string>();
    for (const group of groups) {
      const lines = group.commands
        .filter(name => available.has(name))
        .map(name => {
          listed.add(name);
          return `**/${name}** — ${descriptions[name] || 'Open this command for options.'}`;
        });
      if (lines.length) embed.addFields({ name: group.name, value: lines.join('\n') });
    }

    const unlisted = [...available].filter(name => !listed.has(name)).sort();
    if (unlisted.length) {
      embed.addFields({
        name: 'More commands',
        value: unlisted.map(name => `**/${name}** — ${descriptions[name] || 'Open this command for options.'}`).join('\n').slice(0, 1024)
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export default helpCommand;
