// File: src/commands/moderation/purge.ts


import { ChatInputCommandInteraction, Client, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Deletes channel messages')
    .addIntegerOption((option) => option
      .setName('integer')
      .setDescription('Amount of purged messages.')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) as SlashCommandBuilder,

  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
      // Check if the user has admin permissions
      const isAdmin = interaction.memberPermissions?.has('Administrator');
      const integer = interaction.options.getInteger('integer')!;

      if (!isAdmin || !integer) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('You don\'t have the permission to do that or the options were not set correctly.')
          .setColor('#ff0000');

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Fetch messages to delete
      if (!interaction.channel?.isTextBased() || interaction.channel.isDMBased()) {
        throw new Error('This command can only be used in server text channels');
      }

      const messages = await interaction.channel.messages.fetch({ limit: integer });

      // Delete messages
      await (interaction.channel as any).bulkDelete(messages, true);

      // Send confirmation
      const embed = new EmbedBuilder()
        .setTitle('Purging...')
        .setDescription(`${integer} posts in this channel were purged.`)
        .setColor('#ab0000');

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error in purge command:', error);

      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('An error occurred while trying to purge messages.')
        .setColor('#ff0000');

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default purgeCommand;