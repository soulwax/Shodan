// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, ContextMenuCommandBuilder, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../core/client';
import { Command } from '../../types/command';
import { truncateAtBoundary } from '../../utils/text';

const descriptions: Record<string, string> = {
  avatar: 'Show a member’s avatar.',
  balance: 'Check your five server campaign coin balances.',
  banned: 'List members banned from this server.',
  character: 'Use `/character init`, `read`, `ask`, `remember`, `change`, or `hp` for your saved sheet.',
  coinflip: 'Flip a coin.',
  compliment: 'Send a longer compliment for yourself or others, using their recent posts with opt-in.',
  describe: 'Narrate an upload with `/describe`, or right-click an image post and choose Apps → Describe image.',
  dice: 'Roll several random values within a range.',
  'Describe image': 'Narrate an image already posted in chat with Apps → Describe image.',
  divine: 'Choose a tarot spread, get a private reading, and replay it with its seed.',
  echo: 'Repeat a message.',
  encounter: 'Start with `start`; players use `join` to roll from their saved Dexterity and enter initiative. Use `add` for foes, then `next`, `status`, `damage`, `heal`, `remove`, `twist`, or `end`.',
  example: 'Show a sample embed.',
  fortune: 'Get a lighthearted fortune.',
  help: 'Show this command guide.',
  image: 'Generate a new image or edit an attached base image.',
  join: 'Join your current voice channel (no music playback).',
  members: 'List members of this server.',
  npc: 'Generate a campaign aware NPC; `save:true` adds it to the journal.',
  ping: 'Check bot response time.',
  privacy: 'Message history is off by default; opt in to future capture or separately to backfill older posts.',
  purge: 'Delete up to 100 recent messages.',
  'purge-char': 'Erase your saved character and notes for this server.',
  campaign: 'Create and organize campaigns, bind them to channels, and set the DM role.',
  quest: 'Generate a campaign aware quest; `save:true` adds it to the journal.',
  roll: 'Roll dice using notation such as `2d6`.',
  roast: 'Ask for a playful roast.',
  'Remix image': 'Edit the image in a selected post with a prompt.',
  'Save to journal': 'Add a selected post to the campaign journal.',
  ship: 'Get a playful compatibility read for two names.',
  speak: 'Generate a short spoken audio clip from a prompt.',
  story: 'Use `add`, `recent`, `search`, `show`, `edit`, `delete`, `ask`, `interpret`, `big-picture`, or `recap` for the typed journal and connected campaign memory.',
  session: 'Use `start`, `note`, `status`, `end`, `draft`, and `publish` to run a session and review its recap.',
  store: 'Deposit coins, for example `coins:20sp 10gp 5e`.',
  withdraw: 'Withdraw coins using the same notation as `/store`.'
};

const groups: Array<{ name: string; commands: string[] }> = [
  { name: '🧭 D&D · Campaign & journal', commands: ['campaign', 'character', 'purge-char', 'story', 'session'] },
  { name: '⚔️ D&D · Encounters & bank', commands: ['encounter', 'quest', 'npc', 'store', 'withdraw', 'balance'] },
  { name: '🔮 Tarot', commands: ['divine'] },
  { name: '🎲 Fun & AI', commands: ['roll', 'dice', 'coinflip', 'describe', 'image', 'speak', 'roast', 'compliment', 'fortune', 'ship'] },
  { name: '🛠️ Server utilities', commands: ['avatar', 'echo', 'ping', 'privacy', 'join', 'help', 'example'] },
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
    const messageActionNames = new Set([...client.commands.entries()]
      .filter(([, command]) => command.data instanceof ContextMenuCommandBuilder)
      .map(([name]) => name));
    const embed = new EmbedBuilder()
      .setTitle('Shodan · Command guide')
      .setDescription('Pick a slash command to see its options. Right-click a post and choose Apps for message actions. D&D campaign tools are scoped to this server.')
      .setColor(0x15999f)
      .setAuthor({
        name: client.user?.tag || 'Shodan Bot',
        iconURL: client.user?.displayAvatarURL({ size: 256 })
      });

    const listed = new Set<string>();
    for (const group of groups) {
      const lines = group.commands
        .filter(name => available.has(name) && !messageActionNames.has(name))
        .map(name => {
          listed.add(name);
          return `**/${name}** — ${descriptions[name] || 'Open this command for options.'}`;
        });
      if (lines.length) embed.addFields({ name: group.name, value: lines.join('\n') });
    }

    const messageActions = [...messageActionNames].sort();
    if (messageActions.length) {
      messageActions.forEach(name => listed.add(name));
      embed.addFields({
        name: 'Message actions · Apps menu',
        value: messageActions.map(name => `**${name}** — ${descriptions[name] || 'Choose this action from a message’s Apps menu.'}`).join('\n')
      });
    }

    const unlisted = [...available].filter(name => !listed.has(name)).sort();
    if (unlisted.length) {
      embed.addFields({
        name: 'More commands',
        value: truncateAtBoundary(unlisted.map(name => `**/${name}** — ${descriptions[name] || 'Open this command for options.'}`).join('\n'), 1024)
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export default helpCommand;
