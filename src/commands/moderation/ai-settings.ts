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

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import {
  getPersonaById,
  getPersonasForIntensity,
  PERSONAS,
  PERSONA_PRESENTATION,
  PERSONA_SEX_LABELS,
  RANDOM_PERSONA_ID
} from '../../data/personas';
import { AI_SETTING_LIMITS, REASONING_EFFORT_CHOICES } from '../../data/ai-settings';
import { DEFAULT_AI_TEMPERATURE as DEFAULT_TEMPERATURE, DEFAULT_AI_REASONING_EFFORT as DEFAULT_REASONING_EFFORT } from '../../config/ai';
import { DEFAULT_DIVINE_MEANNESS, MAX_MEANNESS_LEVEL, MEANNESS_CHOICES, MEANNESS_LABELS, MIN_MEANNESS_LEVEL } from '../../data/persona-intensities';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

function personaLabel(persona: ReturnType<typeof getPersonaById>): string {
  if (!persona) return PERSONA_PRESENTATION.randomChoice;
  const sexLabel = PERSONA_SEX_LABELS[persona.sex];
  return `${sexLabel} · ${persona.name}`;
}

function personaEmbed(persona: NonNullable<ReturnType<typeof getPersonaById>>, guildName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(persona.name)
    .setDescription(
      `${PERSONA_SEX_LABELS[persona.sex]} · ${PERSONA_PRESENTATION.ageLabel} ${persona.age} · ${MEANNESS_LABELS[persona.intensity]}\n` +
      `${persona.occupation} · ${persona.origin}`
    )
    .addFields(
      { name: PERSONA_PRESENTATION.fields.background, value: persona.background },
      { name: PERSONA_PRESENTATION.fields.temperament, value: persona.temperament },
      { name: PERSONA_PRESENTATION.fields.traits, value: persona.traits.join(' · ') },
      { name: PERSONA_PRESENTATION.fields.values, value: persona.values.join(' · ') },
      { name: PERSONA_PRESENTATION.fields.mannerisms, value: persona.mannerisms.join(' · ') },
      { name: PERSONA_PRESENTATION.fields.voice, value: persona.voice }
    )
    .setFooter({ text: PERSONA_PRESENTATION.serverVoiceFooter(guildName) });
}

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
        .setMinValue(AI_SETTING_LIMITS.temperature.min)
        .setMaxValue(AI_SETTING_LIMITS.temperature.max)))
    .addSubcommand(command => command
      .setName('max-tokens')
      .setDescription('Set a server-wide output token limit; applies to all AI responses.')
      .addIntegerOption(option => option
        .setName('value')
        .setDescription('Maximum generated tokens (64 to 16384).')
        .setRequired(true)
        .setMinValue(AI_SETTING_LIMITS.maxTokens.min)
        .setMaxValue(AI_SETTING_LIMITS.maxTokens.max)))
    .addSubcommand(command => command
      .setName('reasoning')
      .setDescription('Set the OpenAI reasoning effort (default: low).')
      .addStringOption(option => option
        .setName('effort')
        .setDescription('Lower effort is faster; higher effort uses more reasoning.')
        .setRequired(true)
        .addChoices(...REASONING_EFFORT_CHOICES)))
    .addSubcommand(command => command
      .setName('divine-meanness')
      .setDescription('Set the default playful snark level for non-wholesome /divine readings.')
      .addIntegerOption(option => option
        .setName('level')
        .setDescription('1 is gentle; 5 is a scathing roast of the situation. Default: 2.')
        .setRequired(true)
        .setMinValue(MIN_MEANNESS_LEVEL)
        .setMaxValue(MAX_MEANNESS_LEVEL)
        .addChoices(...MEANNESS_CHOICES)))
    .addSubcommand(command => command
      .setName('divine-personality')
      .setDescription('Set or inspect this server’s character for /divine, /speak, and /image.')
      .addStringOption(option => option
        .setName('voice')
        .setDescription('Choose a character, or randomize /divine readings. /speak and /image use saved characters only.')
        .setRequired(false)
        .addChoices(
          { name: PERSONA_PRESENTATION.randomChoice, value: RANDOM_PERSONA_ID },
          ...PERSONAS.map(persona => ({
            name: `${personaLabel(persona)} · ${MEANNESS_LABELS[persona.intensity]}`,
            value: persona.id
          }))
        )))
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
          select: { aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true, divineMeanness: true, divinePersonality: true }
        });
        const meanness = settings?.divineMeanness ?? DEFAULT_DIVINE_MEANNESS;
        const voiceId = settings?.divinePersonality ?? RANDOM_PERSONA_ID;
        const selectedPersona = getPersonaById(voiceId);
        const voiceDescription = selectedPersona?.intensity === meanness
          ? personaLabel(selectedPersona)
          : `Random each reading (${getPersonasForIntensity(meanness).map(personaLabel).join(', ')})`;
        await interaction.editReply(
          `**${guild.name} AI settings**\n` +
          `Temperature: ${settings?.aiTemperature ?? DEFAULT_TEMPERATURE.toFixed(1)}\n` +
          `Max output tokens: ${settings?.aiMaxTokens ?? 'command default'}\n` +
          `OpenAI reasoning effort: ${settings?.aiReasoningEffort ?? DEFAULT_REASONING_EFFORT}\n` +
          `Default /divine meanness: ${MEANNESS_LABELS[meanness]}\n` +
          `Default /divine voice: ${voiceDescription}`
        );
        return;
      }

      if (subcommand === 'divine-personality') {
        const voiceId = interaction.options.getString('voice');
        const settings = await prisma.dndServer.findUnique({
          where: { discordId: guild.id },
          select: { divineMeanness: true, divinePersonality: true }
        });
        const meanness = settings?.divineMeanness ?? DEFAULT_DIVINE_MEANNESS;

        if (voiceId === null) {
          const selectedId = settings?.divinePersonality ?? RANDOM_PERSONA_ID;
          const selectedPersona = getPersonaById(selectedId);
          if (selectedPersona?.intensity === meanness) {
            await interaction.editReply({ embeds: [personaEmbed(selectedPersona, guild.name)] });
            return;
          }

          const candidates = getPersonasForIntensity(meanness);
          const embed = new EmbedBuilder()
            .setTitle(`${guild.name} · /divine voice`)
            .setDescription(
              `Random each reading · ${MEANNESS_LABELS[meanness]}\n` +
              'Choose a voice with `/ai-settings divine-personality` to save it for this server.'
            )
            .addFields(candidates.map(persona => ({
              name: personaLabel(persona),
              value: `Age ${persona.age} · ${persona.occupation}\n${persona.background}`
            })));
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const persona = getPersonaById(voiceId);
        if (voiceId !== RANDOM_PERSONA_ID && !persona) {
          await interaction.editReply('That voice is not available. Choose one from the listed options.');
          return;
        }
        if (persona && persona.intensity !== meanness) {
          const compatible = getPersonasForIntensity(meanness).map(personaLabel).join(', ');
          await interaction.editReply(
            `**${personaLabel(persona)}** is a ${MEANNESS_LABELS[persona.intensity].toLowerCase()} voice. ` +
            `This server is set to ${MEANNESS_LABELS[meanness]}. Choose one of these voices: ${compatible}. ` +
            `You can also change the meanness level first.`
          );
          return;
        }

        const updated = await prisma.dndServer.upsert({
          where: { discordId: guild.id },
          create: {
            discordId: guild.id,
            name: guild.name,
            aiTemperature: DEFAULT_TEMPERATURE,
            aiReasoningEffort: DEFAULT_REASONING_EFFORT,
            divineMeanness: DEFAULT_DIVINE_MEANNESS,
            divinePersonality: voiceId
          },
          update: { name: guild.name, divinePersonality: voiceId },
          select: { divineMeanness: true, divinePersonality: true }
        });
        const savedPersona = getPersonaById(updated.divinePersonality);
        await interaction.editReply(
          `Saved the default /divine voice for **${guild.name}**: ` +
          `${personaLabel(savedPersona)}.`
        );
        return;
      }

      let resetIncompatibleVoice = false;
      const values = subcommand === 'reset'
        ? {
            aiTemperature: DEFAULT_TEMPERATURE,
            aiMaxTokens: null,
            aiReasoningEffort: DEFAULT_REASONING_EFFORT,
            divineMeanness: DEFAULT_DIVINE_MEANNESS,
            divinePersonality: RANDOM_PERSONA_ID
          }
        : subcommand === 'temperature'
          ? { aiTemperature: interaction.options.getNumber('value', true) }
          : subcommand === 'max-tokens'
            ? { aiMaxTokens: interaction.options.getInteger('value', true) }
            : subcommand === 'reasoning'
              ? { aiReasoningEffort: interaction.options.getString('effort', true) }
              : { divineMeanness: interaction.options.getInteger('level', true) };

      if (subcommand === 'divine-meanness') {
        const level = interaction.options.getInteger('level', true);
        const current = await prisma.dndServer.findUnique({
          where: { discordId: guild.id },
          select: { divinePersonality: true }
        });
        const currentPersona = getPersonaById(current?.divinePersonality ?? RANDOM_PERSONA_ID);
        if (currentPersona && currentPersona.intensity !== level) {
          Object.assign(values, { divinePersonality: RANDOM_PERSONA_ID });
          resetIncompatibleVoice = true;
        }
      }

      const settings = await prisma.dndServer.upsert({
        where: { discordId: guild.id },
        create: {
          discordId: guild.id,
          name: guild.name,
          aiTemperature: DEFAULT_TEMPERATURE,
          aiReasoningEffort: DEFAULT_REASONING_EFFORT,
          divineMeanness: DEFAULT_DIVINE_MEANNESS,
          divinePersonality: RANDOM_PERSONA_ID,
          ...values
        },
        update: { name: guild.name, ...values },
        select: { aiTemperature: true, aiMaxTokens: true, aiReasoningEffort: true, divineMeanness: true, divinePersonality: true }
      });

      await interaction.editReply(
        `Saved AI settings for **${guild.name}**. Temperature: ${settings.aiTemperature}; ` +
        `max output tokens: ${settings.aiMaxTokens ?? 'command default'}; ` +
        `OpenAI reasoning effort: ${settings.aiReasoningEffort}; ` +
        `default /divine meanness: ${MEANNESS_LABELS[settings.divineMeanness]}; ` +
        `voice: ${personaLabel(getPersonaById(settings.divinePersonality))}.` +
        (resetIncompatibleVoice ? ' The previously selected voice did not match this level, so it was reset to random.' : '')
      );
    } catch (error) {
      logger.error('[AI settings] Failed to read or update server settings:', error);
      await interaction.editReply('I couldn’t read or save those AI settings. Please try again.');
    }
  }
};

export default aiSettingsCommand;
