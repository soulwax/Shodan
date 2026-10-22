// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { DndCurrency } from '@prisma/client';
import { getAIService } from '../../services/ai';
import { campaignChannelScope, getCampaignContext } from '../../services/dnd-campaign';
import { CURRENCIES, formatCoins } from '../../services/dnd-currency';
import { getWallet, getWalletCurrencies } from '../../services/dnd-wallet';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { truncateAtBoundary } from '../../utils/text';

const currencies = [DndCurrency.CP, DndCurrency.SP, DndCurrency.GP, DndCurrency.EL, DndCurrency.PC];

async function narrateVault(entries: string[], guildId: string): Promise<string> {
  try {
    const response = await getAIService().createChatCompletion([
      {
        role: 'system',
        content: 'You are a fantasy bankkeeper giving a quick, warm update about an adventurer’s vault. In one short line, describe its feel based on the mix of coins. Be playful and grounded, not grandiose. Do not repeat the amounts or suggest the money has changed. No markdown. Under 20 words.'
      },
      { role: 'user', content: `The vault contains ${entries.join(', ')}. Give the bankkeeper’s one-line observation.` }
    ], { temperature: 0.8, max_tokens: 60, guildId });
    return response?.trim() ? truncateAtBoundary(response.trim(), 250) : 'The ledger is up to date.';
  } catch {
    logger.warn('[D&D] AI balance narration unavailable; using the standard line.');
    return 'Every coin is accounted for.';
  }
}

const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check the coins in your adventurer bank.'),
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
      const channel = interaction.channel;
      const { server, campaign } = await getCampaignContext(
        guild.id,
        guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      );
      const wallet = await getWallet(campaign.id, interaction.user.id);
      const balances = wallet
        ? getWalletCurrencies(wallet, currencies)
        : currencies.map(currency => ({ currency, amount: 0n }));
      const lines = balances.map(({ currency, amount }) => `**${formatCoins(amount)} ${currency.toLowerCase()}**`);
      const entries = balances.map(({ currency, amount }) => `${formatCoins(amount)} ${CURRENCIES[currency].label}`);
      const narration = !server.aiNarrationEnabled
        ? 'Your coins are right where you left them.'
        : await narrateVault(entries, guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🏦 Your adventurer vault')
        .setDescription(`${lines.join('\n')}\n\n${narration}`)
        .setFooter({ text: `This balance belongs to you in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.error('[D&D] Failed to read coin balance:', error);
      await interaction.editReply({ content: 'I couldn’t read your balance just now. Please try again.' });
    }
  }
};

export default balanceCommand;
