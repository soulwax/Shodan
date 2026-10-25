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

// File: src/commands/utility/color.ts

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../types/client';
import { Command } from '../../types/command';
import { COLOR_PALETTE } from '../../data/colors';
import { executeColorCommand } from '../../services/color-roles';

const colorCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Switch, browse, or remove your server color role.')
    .addSubcommand(sub =>
      sub
        .setName('switch')
        .setDescription('Switch your color role or another member’s color role.')
        .addStringOption(option => {
          option
            .setName('color')
            .setDescription('Choose a palette color or enter a hex code (e.g. #3498DB).')
            .setRequired(false);
          for (const color of COLOR_PALETTE) {
            option.addChoices({
              name: `${color.emoji} ${color.name} (${color.hex})`,
              value: color.id
            });
          }
          return option;
        })
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Switch to an existing server role.')
            .setRequired(false)
        )
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Target member to switch color for (requires Manage Roles).')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Browse available color roles and open the interactive color switcher.')
        .addBooleanOption(option =>
          option
            .setName('public')
            .setDescription('Show the color switcher publicly in this channel (default: false).')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove your active color role or another member’s color role.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Target member to remove color for (requires Manage Roles).')
            .setRequired(false)
        )
    ),

  category: 'utility',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient): Promise<void> {
    await executeColorCommand(interaction, client, 'color');
  }
};

export default colorCommand;

