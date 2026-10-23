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

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

type StyleMetrics = {
  avgWordsPerSentence: number;
  avgWordLength: number;
  lowercaseSentenceStartRatio: number;
  emojiPer100Words: number;
  exclamationPer100Sentences: number;
  questionPer100Sentences: number;
  contractionPer100Words: number;
};

const metricKeys: Array<keyof StyleMetrics> = [
  'avgWordsPerSentence',
  'avgWordLength',
  'lowercaseSentenceStartRatio',
  'emojiPer100Words',
  'exclamationPer100Sentences',
  'questionPer100Sentences',
  'contractionPer100Words'
];

function analyzeSample(sample: string): StyleMetrics {
  const words = sample.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  const sentences = sample.split(/[.!?]+(?:[”’"')\]]*)?(?:\s|$)/u).map(part => part.trim()).filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);
  const lowercaseStarts = sentences.filter(sentence => /^["'“‘([{\s]*[a-z]/u.test(sentence)).length;
  const emojiCount = sample.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  const contractions = sample.match(/\b[\p{L}]+['’](?:t|re|ve|ll|d|m|s)\b/giu)?.length ?? 0;

  return {
    avgWordsPerSentence: words.length / sentenceCount,
    avgWordLength: words.length ? words.reduce((total, word) => total + word.replace(/[^\p{L}\p{N}]/gu, '').length, 0) / words.length : 0,
    lowercaseSentenceStartRatio: lowercaseStarts / sentenceCount,
    emojiPer100Words: words.length ? emojiCount * 100 / words.length : 0,
    exclamationPer100Sentences: (sample.match(/!/g)?.length ?? 0) * 100 / sentenceCount,
    questionPer100Sentences: (sample.match(/\?/g)?.length ?? 0) * 100 / sentenceCount,
    contractionPer100Words: words.length ? contractions * 100 / words.length : 0
  };
}

function parseMetrics(value: Prisma.JsonValue): StyleMetrics | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, Prisma.JsonValue>;
  if (!metricKeys.every(key => typeof record[key] === 'number')) return null;
  return Object.fromEntries(metricKeys.map(key => [key, record[key]])) as StyleMetrics;
}

function combineMetrics(previous: StyleMetrics | null, next: StyleMetrics, sampleCount: number): StyleMetrics {
  if (!previous || sampleCount === 0) return next;
  return Object.fromEntries(metricKeys.map(key => [
    key,
    Math.round(((previous[key] * sampleCount + next[key]) / (sampleCount + 1)) * 100) / 100
  ])) as StyleMetrics;
}

function renderProfile(metrics: StyleMetrics, sampleCount: number): string {
  return `Your local style profile uses ${sampleCount} sample${sampleCount === 1 ? '' : 's'}:\n` +
    `• Average sentence length: ${metrics.avgWordsPerSentence.toFixed(1)} words\n` +
    `• Average word length: ${metrics.avgWordLength.toFixed(1)} characters\n` +
    `• Lowercase sentence openings: ${Math.round(metrics.lowercaseSentenceStartRatio * 100)}%\n` +
    `• Emoji frequency: ${metrics.emojiPer100Words.toFixed(1)} per 100 words\n` +
    `• Exclamation marks: ${metrics.exclamationPer100Sentences.toFixed(1)} per 100 sentences\n` +
    `• Questions: ${metrics.questionPer100Sentences.toFixed(1)} per 100 sentences\n` +
    `• Contractions: ${metrics.contractionPer100Words.toFixed(1)} per 100 words`;
}

const styleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('style')
    .setDescription('Manage your private, opt-in writing-style profile for this server.')
    .addSubcommand(command => command
      .setName('learn')
      .setDescription('Analyze a sample locally; the sample itself is not saved.')
      .addStringOption(option => option
        .setName('sample')
        .setDescription('A sample of your own writing (100 to 1500 characters).')
        .setRequired(true)
        .setMinLength(100)
        .setMaxLength(1500)))
    .addSubcommand(command => command
      .setName('show')
      .setDescription('View your style profile for this server.'))
    .addSubcommand(command => command
      .setName('forget')
      .setDescription('Delete your style profile from this server.')),
  category: 'utility',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Style profiles are private to each server. Use this command inside a server.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    try {
      if (subcommand === 'forget') {
        const server = await prisma.dndServer.findUnique({ where: { discordId: interaction.guild.id }, select: { id: true } });
        const result = server
          ? await prisma.userWritingStyle.deleteMany({ where: { serverId: server.id, discordUserId: interaction.user.id } })
          : { count: 0 };
        await interaction.editReply(result.count ? 'Your style profile and its learned statistics have been deleted from this server.' : 'You don’t have a style profile in this server.');
        return;
      }

      const server = await prisma.dndServer.findUnique({ where: { discordId: interaction.guild.id }, select: { id: true } });
      if (subcommand === 'show') {
        const profile = server
          ? await prisma.userWritingStyle.findUnique({ where: { serverId_discordUserId: { serverId: server.id, discordUserId: interaction.user.id } } })
          : null;
        const metrics = profile ? parseMetrics(profile.profile) : null;
        await interaction.editReply(metrics && profile ? renderProfile(metrics, profile.sampleCount) : 'You haven’t opted in yet. Use `/style learn` with a sample of your own writing.');
        return;
      }

      const sample = interaction.options.getString('sample', true).trim();
      const words = sample.match(/[\p{L}\p{N}]+/gu) ?? [];
      if (words.length < 15) {
        await interaction.editReply('Please provide at least 15 words so the local style estimate has enough text. The sample itself is not saved.');
        return;
      }

      const serverRecord = await prisma.dndServer.upsert({
        where: { discordId: interaction.guild.id },
        create: { discordId: interaction.guild.id, name: interaction.guild.name },
        update: { name: interaction.guild.name },
        select: { id: true }
      });
      const existing = await prisma.userWritingStyle.findUnique({
        where: { serverId_discordUserId: { serverId: serverRecord.id, discordUserId: interaction.user.id } }
      });
      const metrics = combineMetrics(existing ? parseMetrics(existing.profile) : null, analyzeSample(sample), existing?.sampleCount ?? 0);
      const profile = await prisma.userWritingStyle.upsert({
        where: { serverId_discordUserId: { serverId: serverRecord.id, discordUserId: interaction.user.id } },
        create: {
          serverId: serverRecord.id,
          discordUserId: interaction.user.id,
          profile: metrics as unknown as Prisma.InputJsonValue,
          sampleCount: 1
        },
        update: {
          profile: metrics as unknown as Prisma.InputJsonValue,
          sampleCount: { increment: 1 }
        }
      });
      await interaction.editReply(`${renderProfile(metrics, profile.sampleCount)}\n\nThe sample was analyzed in this bot process and discarded. Only these aggregate statistics are stored. A compact style instruction may be included with your future AI requests in this server. Use /style forget to remove the profile.`);
    } catch (error) {
      logger.error('[Style] Failed to read or update style profile:', error);
      await interaction.editReply('I couldn’t update your style profile. Please try again.');
    }
  }
};

export default styleCommand;
