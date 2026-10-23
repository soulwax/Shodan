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

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';
import {
  CHARACTER_COMMAND_COPY,
  CHARACTER_DETAIL_FIELDS,
  CHARACTER_DISPLAY_LIMITS,
  CHARACTER_EDITABLE_FIELDS,
  CHARACTER_GENERATION_SETTINGS,
  CHARACTER_HP_ACTION,
  CHARACTER_HP_ACTIONS,
  CHARACTER_LIMITS,
  CHARACTER_MESSAGES,
  CHARACTER_NUMERIC_FIELDS,
  CHARACTER_SUMMARY_LINES
} from '../../data/dnd-character';
import { DND_PROMPTS } from '../../data/prompts/dnd';
import { getAIService } from '../../services/ai';
import { campaignChannelScope, getCampaignContext } from '../../services/dnd-campaign';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { shortenPromptText, truncateAtBoundary } from '../../utils/text';

function printable(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function extractJson(response: string): Record<string, unknown> {
  const cleaned = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI returned invalid character data');
  return parsed as Record<string, unknown>;
}

const characterCommand: Command = {
  data: new SlashCommandBuilder()
    .setName(CHARACTER_COMMAND_COPY.command.name)
    .setDescription(CHARACTER_COMMAND_COPY.command.description)
    .addSubcommand(subcommand => subcommand
      .setName(CHARACTER_COMMAND_COPY.subcommands.init.name)
      .setDescription(CHARACTER_COMMAND_COPY.subcommands.init.description)
      .addAttachmentOption(option => option.setName(CHARACTER_COMMAND_COPY.options.pdf.name).setDescription(CHARACTER_COMMAND_COPY.options.pdf.description).setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName(CHARACTER_COMMAND_COPY.subcommands.read.name).setDescription(CHARACTER_COMMAND_COPY.subcommands.read.description))
    .addSubcommand(subcommand => subcommand
      .setName(CHARACTER_COMMAND_COPY.subcommands.ask.name)
      .setDescription(CHARACTER_COMMAND_COPY.subcommands.ask.description)
      .addStringOption(option => option.setName(CHARACTER_COMMAND_COPY.options.question.name).setDescription(CHARACTER_COMMAND_COPY.options.question.description).setRequired(true).setMaxLength(CHARACTER_LIMITS.questionCharacters)))
    .addSubcommand(subcommand => subcommand
      .setName(CHARACTER_COMMAND_COPY.subcommands.remember.name)
      .setDescription(CHARACTER_COMMAND_COPY.subcommands.remember.description)
      .addStringOption(option => option.setName(CHARACTER_COMMAND_COPY.options.note.name).setDescription(CHARACTER_COMMAND_COPY.options.note.description).setRequired(true).setMaxLength(CHARACTER_LIMITS.memoryCharacters)))
    .addSubcommand(subcommand => subcommand
      .setName(CHARACTER_COMMAND_COPY.subcommands.hp.name)
      .setDescription(CHARACTER_COMMAND_COPY.subcommands.hp.description)
      .addStringOption(option => option.setName(CHARACTER_COMMAND_COPY.options.action.name).setDescription(CHARACTER_COMMAND_COPY.options.action.description).setRequired(true).addChoices(...CHARACTER_HP_ACTIONS))
      .addIntegerOption(option => option.setName(CHARACTER_COMMAND_COPY.options.amount.name).setDescription(CHARACTER_COMMAND_COPY.options.amount.description).setRequired(true).setMinValue(0).setMaxValue(CHARACTER_LIMITS.hpAmount)))
    .addSubcommand(subcommand => subcommand
      .setName(CHARACTER_COMMAND_COPY.subcommands.change.name)
      .setDescription(CHARACTER_COMMAND_COPY.subcommands.change.description)
      .addStringOption(option => option.setName(CHARACTER_COMMAND_COPY.options.field.name).setDescription(CHARACTER_COMMAND_COPY.options.field.description).setRequired(true)
        .addChoices(...CHARACTER_EDITABLE_FIELDS.map(field => ({ name: field.label, value: field.key }))))
      .addStringOption(option => option.setName(CHARACTER_COMMAND_COPY.options.value.name).setDescription(CHARACTER_COMMAND_COPY.options.value.description).setRequired(true).setMaxLength(CHARACTER_LIMITS.editableTextCharacters))),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Characters are stored separately for each server. Use this command in your D&D server.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = interaction.channel;
      const campaign = (await getCampaignContext(
        interaction.guild.id,
        interaction.guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      )).campaign;
      const owner = interaction.user.id;
      const action = interaction.options.getSubcommand();

      if (action === CHARACTER_COMMAND_COPY.subcommands.init.name) {
        const attachment = interaction.options.getAttachment(CHARACTER_COMMAND_COPY.options.pdf.name, true);
        if (attachment.contentType !== 'application/pdf' && !attachment.name.toLowerCase().endsWith('.pdf')) {
          await interaction.editReply('Please attach a PDF character sheet.');
          return;
        }
        if (attachment.size > CHARACTER_LIMITS.pdfBytes) {
          await interaction.editReply('That PDF is over 10 MB. Please attach a smaller sheet.');
          return;
        }
        const download = await fetch(attachment.url);
        if (!download.ok) throw new Error(`PDF download failed with HTTP ${download.status}`);
        const bytes = Buffer.from(await download.arrayBuffer());
        if (bytes.length > CHARACTER_LIMITS.pdfBytes) throw new Error('PDF exceeds the 10 MB limit');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: bytes });
        let sheetText: string;
        try {
          sheetText = (await parser.getText()).text.trim();
        } finally {
          await parser.destroy();
        }
        if (sheetText.length < 30) {
          await interaction.editReply('I couldn’t find readable text in that PDF. Please use a searchable PDF character sheet.');
          return;
        }
        const answer = await getAIService().generateText([
          { role: 'system', content: DND_PROMPTS.characterSheetExtraction.system },
          { role: 'user', content: DND_PROMPTS.characterSheetExtraction.user(shortenPromptText(sheetText, CHARACTER_LIMITS.pdfPromptCharacters)) }
        ], {
          temperature: CHARACTER_GENERATION_SETTINGS.sheetExtraction.temperature,
          max_tokens: CHARACTER_GENERATION_SETTINGS.sheetExtraction.maxTokens,
          preserveExplicitTemperature: CHARACTER_GENERATION_SETTINGS.sheetExtraction.preserveExplicitTemperature
        });
        if (!answer) throw new Error('No character sheet data was returned');
        const sheetData = extractJson(answer);
        const name = typeof sheetData.name === 'string' ? sheetData.name.slice(0, CHARACTER_LIMITS.editableTextCharacters) : null;
        await prisma.dndCharacter.upsert({
          where: { campaignId_discordUserId: { campaignId: campaign.id, discordUserId: owner } },
          create: { campaignId: campaign.id, discordUserId: owner, characterName: name, sheetData: sheetData as Prisma.InputJsonValue },
          update: { characterName: name, sheetData: sheetData as Prisma.InputJsonValue }
        });
        await interaction.editReply(CHARACTER_MESSAGES.imported(name || CHARACTER_MESSAGES.defaultImportedName, attachment.name));
        return;
      }

      const character = await prisma.dndCharacter.findUnique({
        where: { campaignId_discordUserId: { campaignId: campaign.id, discordUserId: owner } }
      });
      if (!character) {
        await interaction.editReply('You don’t have a saved character in this server yet. Start with `/character init` and a PDF sheet.');
        return;
      }
      if (action === CHARACTER_COMMAND_COPY.subcommands.read.name) {
        const fields = character.sheetData && typeof character.sheetData === 'object' && !Array.isArray(character.sheetData)
          ? character.sheetData as Record<string, unknown>
          : {};
        const summary = CHARACTER_SUMMARY_LINES.map(line => line.map(cell =>
          `**${cell.label}:** ${cell.keys.map(key => printable(fields[key])).join('separator' in cell ? cell.separator : '')}`
        ).join('  ·  ')).join('\n');
        const title = character.characterName || CHARACTER_MESSAGES.defaultTitle;
        const footer = CHARACTER_MESSAGES.privateToServer(interaction.guild.name);
        const summaryText = truncateAtBoundary(summary, CHARACTER_DISPLAY_LIMITS.summaryCharacters);
        const embed = new EmbedBuilder().setColor(0x7b5ea7).setTitle(title).setDescription(summaryText);
        // Leave headroom below Discord's 6,000-character total embed limit.
        let remaining = CHARACTER_DISPLAY_LIMITS.embedCharacters - title.length - summaryText.length - footer.length - CHARACTER_DISPLAY_LIMITS.embedSafetyMargin;
        let omittedDetails = summaryText.length < summary.length;
        const addSheetField = (name: string, value: string) => {
          if (value === '—') return;
          const budget = Math.min(CHARACTER_DISPLAY_LIMITS.fieldCharacters, remaining - name.length);
          if (budget < CHARACTER_DISPLAY_LIMITS.minimumFieldCharacters) {
            omittedDetails = true;
            return;
          }
          const displayValue = truncateAtBoundary(value, budget);
          if (displayValue.length < value.trim().length) omittedDetails = true;
          embed.addFields({ name, value: displayValue });
          remaining -= name.length + displayValue.length;
        };
        for (const field of CHARACTER_DETAIL_FIELDS) {
          const value = printable(fields[field.key]);
          addSheetField(field.label, value);
        }
        if (character.memories) addSheetField(CHARACTER_MESSAGES.rememberedNotes, character.memories);
        embed.setFooter({ text: `${footer}${omittedDetails ? CHARACTER_MESSAGES.detailOmitted : ''}` });
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      if (action === CHARACTER_COMMAND_COPY.subcommands.ask.name) {
        const question = interaction.options.getString(CHARACTER_COMMAND_COPY.options.question.name, true).trim();
        // Sheet extraction already has a bounded token budget; keep its JSON intact.
        const sheet = JSON.stringify(character.sheetData);
        let notes = character.memories || DND_PROMPTS.characterQuestion.noSavedNotes;
        if (character.memories.length > CHARACTER_LIMITS.promptMemoryCharacters) {
          let recentNotes = character.memories.slice(-CHARACTER_LIMITS.promptMemoryCharacters);
          const firstCompleteLine = recentNotes.indexOf('\n');
          if (firstCompleteLine >= 0) recentNotes = recentNotes.slice(firstCompleteLine + 1);
          notes = DND_PROMPTS.characterQuestion.omittedNotes(recentNotes);
        }
        const answer = await getAIService().generateText([
          {
            role: 'system',
            content: DND_PROMPTS.characterQuestion.system
          },
          {
            role: 'user',
            content: DND_PROMPTS.characterQuestion.user(sheet, notes, question)
          }
        ], {
          temperature: CHARACTER_GENERATION_SETTINGS.sheetQuestion.temperature,
          max_tokens: CHARACTER_GENERATION_SETTINGS.sheetQuestion.maxTokens
        });
        await interaction.editReply(answer?.trim()
          ? truncateAtBoundary(answer.trim(), CHARACTER_DISPLAY_LIMITS.answerCharacters)
          : 'I couldn’t find an answer in your saved character information.');
        return;
      }
      if (action === CHARACTER_COMMAND_COPY.subcommands.remember.name) {
        const note = interaction.options.getString(CHARACTER_COMMAND_COPY.options.note.name, true).trim();
        const memories = [character.memories, `• ${note}`].filter(Boolean).join('\n').slice(-CHARACTER_LIMITS.savedMemoryCharacters);
        await prisma.dndCharacter.update({ where: { id: character.id }, data: { memories } });
        await interaction.editReply(CHARACTER_MESSAGES.remembered);
        return;
      }
      if (action === CHARACTER_COMMAND_COPY.subcommands.hp.name) {
        const fields = character.sheetData && typeof character.sheetData === 'object' && !Array.isArray(character.sheetData)
          ? { ...character.sheetData as Record<string, unknown> }
          : {};
        const currentHp = Number(fields.hp_current);
        const maximumHp = Number(fields.hp_max);
        if (!Number.isInteger(currentHp) || currentHp < 0 || !Number.isInteger(maximumHp) || maximumHp < 1) {
          await interaction.editReply('Your sheet needs numeric current and maximum HP first. Set them with `/character change`.');
          return;
        }
        const hpAction = interaction.options.getString(CHARACTER_COMMAND_COPY.options.action.name, true);
        const amount = interaction.options.getInteger(CHARACTER_COMMAND_COPY.options.amount.name, true);
        if (hpAction !== CHARACTER_HP_ACTION.set && amount === 0) {
          await interaction.editReply('Enter at least 1 HP for damage or healing.');
          return;
        }
        const nextHp = hpAction === CHARACTER_HP_ACTION.damage
          ? Math.max(0, currentHp - amount)
          : hpAction === CHARACTER_HP_ACTION.heal
            ? Math.min(maximumHp, currentHp + amount)
            : amount;
        if (nextHp > maximumHp) {
          await interaction.editReply(`Your current HP can’t exceed your maximum of ${maximumHp}.`);
          return;
        }
        fields.hp_current = nextHp;
        await prisma.dndCharacter.update({ where: { id: character.id }, data: { sheetData: fields as Prisma.InputJsonValue } });
        const changeText = hpAction === CHARACTER_HP_ACTION.damage ? CHARACTER_MESSAGES.hpDamage(Math.min(amount, currentHp))
          : hpAction === CHARACTER_HP_ACTION.heal ? CHARACTER_MESSAGES.hpRestored(nextHp - currentHp) : CHARACTER_MESSAGES.hpSet;
        await interaction.editReply(`${changeText}. ${CHARACTER_MESSAGES.hpSummary(nextHp, maximumHp)}`);
        return;
      }
      if (action === CHARACTER_COMMAND_COPY.subcommands.change.name) {
        const field = interaction.options.getString(CHARACTER_COMMAND_COPY.options.field.name, true);
        const value = interaction.options.getString(CHARACTER_COMMAND_COPY.options.value.name, true).trim();
        const fieldDefinition = CHARACTER_EDITABLE_FIELDS.find(candidate => candidate.key === field);
        if (!fieldDefinition) throw new Error('Unknown character field');
        const parsedValue: string | number = CHARACTER_NUMERIC_FIELDS.has(field) ? Number(value) : value;
        if (typeof parsedValue === 'number' && (!Number.isInteger(parsedValue) ||
          parsedValue < ('min' in fieldDefinition ? fieldDefinition.min ?? 0 : 0) ||
          parsedValue > ('max' in fieldDefinition ? fieldDefinition.max ?? 10000 : 10000))) {
          if (field === 'dexterity') {
            await interaction.editReply('Dexterity score must be between 1 and 30.');
            return;
          }
          if (field === 'dexterity_modifier') {
            await interaction.editReply('Dexterity modifier must be between -10 and 20.');
            return;
          }
          if (field === 'hp_max' && Number(parsedValue) < 1) {
            await interaction.editReply('Maximum HP must be at least 1.');
            return;
          }
          await interaction.editReply('That field needs a whole number between 0 and 10,000.');
          return;
        }
        const fields = character.sheetData && typeof character.sheetData === 'object' && !Array.isArray(character.sheetData)
          ? { ...character.sheetData as Record<string, unknown> }
          : {};
        if (field === 'hp_max' && Number.isInteger(Number(fields.hp_current)) && Number(fields.hp_current) > Number(parsedValue)) {
          await interaction.editReply(`Maximum HP can’t be lower than your current ${Number(fields.hp_current)} HP.`);
          return;
        }
        if (field === 'hp_current' && Number.isInteger(Number(fields.hp_max)) && Number(fields.hp_max) >= 1 && Number(parsedValue) > Number(fields.hp_max)) {
          await interaction.editReply(`Current HP can’t exceed your maximum of ${Number(fields.hp_max)}.`);
          return;
        }
        fields[field] = parsedValue;
        await prisma.dndCharacter.update({
          where: { id: character.id },
          data: { sheetData: fields as Prisma.InputJsonValue, ...(field === 'name' ? { characterName: String(parsedValue).slice(0, CHARACTER_LIMITS.editableTextCharacters) } : {}) }
        });
        await interaction.editReply(CHARACTER_MESSAGES.fieldUpdated(field.replace('_', ' ')));
      }
    } catch (error) {
      logger.error('[D&D] Character command failed:', error);
      await interaction.editReply('I couldn’t update your character just now. Please try again.');
    }
  }
};

export default characterCommand;
