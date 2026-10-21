import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const DEFAULT_TEMPERATURE = 1.0;
const DEFAULT_REASONING_EFFORT = 'low';
const DEFAULT_DIVINE_MEANNESS = 2;
const MEANNESS_LABELS: Record<number, string> = {
  1: 'Gentle',
  2: 'Dry (default)',
  3: 'Sharp',
  4: 'Spicy',
  5: 'Maximum playful bite'
};

const aiSettingsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ai-settings')
    .setDescription('Set AI generation defaults for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command => command
      .setName('show')
      .setDescription('Show this server’s AI generation settings.'))
    .addSubcommand(command => command
      .setName('temperature')
      .setDescription('Set the creativity level used for AI responses (0 to 2).')
      .addNumberOption(option => option
        .setName('value')
        .setDescription('Higher values make responses more varied. Default: 1.0.')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(2)))
    .addSubcommand(command => command
      .setName('max-tokens')
      .setDescription('Set a server-wide output token limit; applies to all AI responses.')
      .addIntegerOption(option => option
        .setName('value')
        .setDescription('Maximum generated tokens (64 to 16384).')
        .setRequired(true)
        .setMinValue(64)
        .setMaxValue(16384)))
    .addSubcommand(command => command
      .setName('reasoning')
      .setDescription('Set the OpenAI reasoning effort (default: low).')
      .addStringOption(option => option
        .setName('effort')
        .setDescription('Lower effort is faster; higher effort uses more reasoning.')
        .setRequired(true)
        .addChoices(
          { name: 'None', value: 'none' },
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' },
          { name: 'Extra high', value: 'xhigh' },
          { name: 'Maximum', value: 'max' }
        )))
    .addSubcommand(command => command
      .setName('divine-meanness')
      .setDescription('Set the default playful snark level for non-wholesome /divine readings.')
      .addIntegerOption(option => option
        .setName('level')
        .setDescription('1 is gentle; 5 is the sharpest playful setting. Default: 2.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)))
    .addSubcommand(command => command
      .setName('reset')
      .setDescription('Restore the default AI settings for this server.')),
  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'AI settings can only be changed inside a server.', ephemeral: true });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'You need Manage Server permission to change AI settings.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();
    try {
      if (subcommand === 'show') {
        const settings = await prisma.dndServer.findUnique({
          where: { discordId: guild.id },
          select: { aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true, divineMeanness: true }
        });
        await interaction.editReply(
          `**${guild.name} AI settings**\n` +
          `Temperature: ${settings?.aiTemperature ?? DEFAULT_TEMPERATURE.toFixed(1)}\n` +
          `Max output tokens: ${settings?.aiMaxTokens ?? 'command default'}\n` +
          `OpenAI reasoning effort: ${settings?.aiReasoningEffort ?? DEFAULT_REASONING_EFFORT}\n` +
          `Default /divine meanness: ${MEANNESS_LABELS[settings?.divineMeanness ?? DEFAULT_DIVINE_MEANNESS]}`
        );
        return;
      }

      const values = subcommand === 'reset'
        ? {
            aiTemperature: DEFAULT_TEMPERATURE,
            aiMaxTokens: null,
            aiReasoningEffort: DEFAULT_REASONING_EFFORT,
            divineMeanness: DEFAULT_DIVINE_MEANNESS
          }
        : subcommand === 'temperature'
          ? { aiTemperature: interaction.options.getNumber('value', true) }
          : subcommand === 'max-tokens'
            ? { aiMaxTokens: interaction.options.getInteger('value', true) }
            : subcommand === 'reasoning'
              ? { aiReasoningEffort: interaction.options.getString('effort', true) }
              : { divineMeanness: interaction.options.getInteger('level', true) };

      const settings = await prisma.dndServer.upsert({
        where: { discordId: guild.id },
        create: {
          discordId: guild.id,
          name: guild.name,
          aiTemperature: DEFAULT_TEMPERATURE,
          aiReasoningEffort: DEFAULT_REASONING_EFFORT,
          divineMeanness: DEFAULT_DIVINE_MEANNESS,
          ...values
        },
        update: { name: guild.name, ...values },
        select: { aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true, divineMeanness: true }
      });

      await interaction.editReply(
        `Saved AI settings for **${guild.name}**. Temperature: ${settings.aiTemperature}; ` +
        `max output tokens: ${settings.aiMaxTokens ?? 'command default'}; ` +
        `OpenAI reasoning effort: ${settings.aiReasoningEffort}; ` +
        `default /divine meanness: ${MEANNESS_LABELS[settings.divineMeanness]}.`
      );
    } catch (error) {
      logger.error('[AI settings] Failed to read or update server settings:', error);
      await interaction.editReply('I couldn’t save those AI settings. Please try again.');
    }
  }
};

export default aiSettingsCommand;
