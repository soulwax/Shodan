// File: src/commands/fun/dice.ts

import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { getRandomSecure } from '../../utils/random';

const diceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Gives a random number between min and max')
    .addIntegerOption((option) => option.setName('n').setDescription('amount of dice').setRequired(true)
    )
    .addIntegerOption((option) => option.setName('min').setDescription('lower range').setRequired(true)
    )
    .addIntegerOption((option) => option.setName('max').setDescription('upper range').setRequired(true)
    ).toJSON(),
  
  category: 'fun',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    const n = interaction.options.getInteger('n')!;
    const min = interaction.options.getInteger('min')!;
    const max = interaction.options.getInteger('max')!;

    const randoms: number[] = [];
    for (let i = 0; i < n; i++) {
      randoms.push(getRandomSecure(min, max));
    }

    const message = randoms.join(', ');
    await interaction.reply({ content: message });
  },
};

export default diceCommand;