// File: src/commands/fun/roll.ts

import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { rollDieSecure } from '../../utils/random';

const rollCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Rolls dice in NdX format (e.g., 2d6 for two six-sided dice)')
    .addStringOption((option) =>
      option
        .setName('dice_notation')
        .setDescription('Dice notation (NdX)')
        .setRequired(true)
    ) as SlashCommandBuilder,
  
  category: 'fun',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const diceNotation = interaction.options.getString('dice_notation')!.toLowerCase();

    try {
      const match = diceNotation.match(/(\d+)[dw](\d+)/);

      if (!match) {
        throw new Error(
          'Invalid dice notation. Use NdX or NwX format (e.g., 2d6 or 3w8).'
        );
      }

      const numDice = parseInt(match[1], 10);
      const numSides = parseInt(match[2], 10);

      if (numDice < 1 || numSides < 2) {
        throw new Error(
          'Invalid number of dice or sides. Must have at least 1 die and 2 sides.'
        );
      }

      const rolls: number[] = [];
      for (let i = 0; i < numDice; i++) {
        rolls.push(rollDieSecure(numSides));
      }

      const total = rolls.reduce((a, b) => a + b, 0);
      const message = `You rolled ${diceNotation}: ${rolls.join(', ')} (Total: ${total})`;
      
      await interaction.reply({ content: message });
    } catch (error) {
      if (error instanceof Error) {
        await interaction.reply({ content: error.message });
      } else {
        await interaction.reply({ content: 'An unknown error occurred' });
      }
    }
  },
};

export default rollCommand;