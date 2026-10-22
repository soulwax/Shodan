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

// File: src/commands/fun/roll.ts



import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { rollDie } from '../../utils/random';

const rollCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice using familiar notation, like 2d6 for two six-sided dice.')
    .addStringOption((option) =>
      option
        .setName('dice_notation')
        .setDescription('What should I roll? For example: 2d6')
        .setRequired(true)
    ) as SlashCommandBuilder,
  
  category: 'fun',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const diceNotation = interaction.options.getString('dice_notation')!.toLowerCase();

    try {
      const match = diceNotation.match(/(\d+)[dw](\d+)/);

      if (!match) {
        throw new Error(
          'I couldn’t read that roll. Try a format like `2d6` or `3w8`.'
        );
      }

      const numDice = parseInt(match[1], 10);
      const numSides = parseInt(match[2], 10);

      if (numDice < 1 || numSides < 2) {
        throw new Error(
          'Give me at least one die, with at least two sides.'
        );
      }

      const rolls: number[] = [];
      for (let i = 0; i < numDice; i++) {
        rolls.push(rollDie(numSides));
      }

      const total = rolls.reduce((a, b) => a + b, 0);
      const message = `🎲 ${diceNotation}: ${rolls.join(', ')}\nTotal: **${total}**`;
      
      await interaction.reply({ content: message });
    } catch (error) {
      if (error instanceof Error) {
        await interaction.reply({ content: error.message });
      } else {
        await interaction.reply({ content: 'Something went wrong with that roll. Try again?' });
      }
    }
  },
};

export default rollCommand;
