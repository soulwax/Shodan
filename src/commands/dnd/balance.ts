// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getAIService } from '../../services/ai';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

function formatGold(amount: bigint): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

async function narrateVault(amount: bigint): Promise<string> {
  const amountLabel = formatGold(amount);
  try {
    const response = await getAIService().createChatCompletion([
      {
        role: 'system',
        content: 'You are a fantasy bankkeeper giving a quick, warm update about an adventurer’s vault. In one short line, describe the feel of the vault based on its balance. Be playful and grounded, not grandiose. Do not repeat the number, suggest the money has changed, or use markdown. Under 20 words.'
      },
      { role: 'user', content: `The vault contains ${amountLabel} gp. Give the bankkeeper’s one-line observation.` }
    ], { temperature: 0.8, max_tokens: 60 });
    return response?.trim().slice(0, 250) || 'The ledger is up to date.';
  } catch {
    logger.warn('[D&D] AI balance narration unavailable; using the standard line.');
    return amount === 0n ? 'An empty vault is just a future story.' : 'Every coin is accounted for.';
  }
}

const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check the gold in your adventurer bank.'),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'The adventurer bank is only available in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      const wallet = await prisma.dndWallet.findFirst({
        where: {
          discordUserId: interaction.user.id,
          campaign: {
            name: 'Main Campaign',
            server: { discordId: guild.id }
          }
        },
        select: {
          goldGp: true,
          campaign: {
            select: { server: { select: { aiNarrationEnabled: true } } }
          }
        }
      });
      const goldGp = wallet?.goldGp ?? 0n;
      const narration = wallet?.campaign.server.aiNarrationEnabled === false
        ? 'Your gold is right where you left it.'
        : await narrateVault(goldGp);
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🏦 Your adventurer vault')
        .setDescription(`**${formatGold(goldGp)} gp**\n${narration}`)
        .setFooter({ text: `This balance belongs to you in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.error('[D&D] Failed to read gold balance:', error);
      await interaction.editReply({ content: 'I couldn’t read your balance just now. Please try again.' });
    }
  }
};

export default balanceCommand;
