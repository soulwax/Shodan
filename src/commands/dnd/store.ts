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
import { coinAmountEntries, formatCoinEntries, formatCoins, parseCoinNotation } from '../../services/dnd-currency';
import { depositCoins } from '../../services/dnd-wallet';
import { walletCurrencyValue } from '../../services/dnd-wallet-mapping';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { truncateAtBoundary } from '../../utils/text';

function fallbackNarration(total: bigint): string {
  if (total <= 10n) return 'The clerk barely pauses before adding the coins to the ledger.';
  if (total >= 100_000n) return 'The clerk finds a suitably impressive place for the haul.';
  return 'The clerk counts the coins twice, then locks them away.';
}

async function narrateDeposit(entries: Array<[DndCurrency, bigint]>, guildId: string): Promise<string> {
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0n);
  try {
    const response = await getAIService().createChatCompletion([
      {
        role: 'system',
        content: 'You are the friendly, slightly opinionated keeper of a fantasy adventurers’ bank. Write one short, vivid line reacting to a deposit of coins that may use several denominations. Sound like a Dungeon Master adding flavor at the table: natural, playful, and specific to the size of the handful. Do not repeat amounts, invent fees, change the balance, or use markdown. Keep it under 25 words.'
      },
      { role: 'user', content: `A player deposited ${formatCoinEntries(entries)}. Give the bankkeeper’s one-line reaction.` }
    ], { temperature: 0.95, max_tokens: 80, guildId });
    return response?.trim() ? truncateAtBoundary(response.trim(), 300) : fallbackNarration(total);
  } catch {
    logger.warn('[D&D] AI narration unavailable; using the standard deposit line.');
    return fallbackNarration(total);
  }
}

const storeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('store')
    .setDescription('Put coins away in your server’s adventurer bank.')
    .addStringOption(option => option
      .setName('coins')
      .setDescription('Coin notation, for example: 20sp 10gp 5e')
      .setRequired(true)
      .setMaxLength(100)),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'The adventurer bank is only available in a server.', ephemeral: true });
      return;
    }

    let amounts;
    try {
      amounts = parseCoinNotation(interaction.options.getString('coins', true));
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : 'I couldn’t read that coin notation.',
        ephemeral: true
      });
      return;
    }
    const entries = coinAmountEntries(amounts);
    await interaction.deferReply();

    try {
      const channel = interaction.channel;
      const { server, campaign } = await getCampaignContext(
        guild.id,
        guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      );
      const narration = server.aiNarrationEnabled ? await narrateDeposit(entries, guild.id) : fallbackNarration(entries.reduce((sum, [, value]) => sum + value, 0n));
      const result = await depositCoins({
        campaignId: campaign.id,
        discordUserId: interaction.user.id,
        interactionId: interaction.id,
        amounts,
        narration
      });

      const balances = entries.map(([currency]) => `**${currency.toLowerCase()} balance:** ${formatCoins(walletCurrencyValue(result, currency))}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🪙 Coins safely stowed')
        .setDescription(`**${formatCoinEntries(entries)} deposited.**\n${narration}\n\n${balances}`)
        .setFooter({ text: `Your balance is kept separately in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.error('[D&D] Failed to store coins:', error);
      await interaction.editReply({ content: 'I couldn’t store your coins just now. No deposit was made; please try again.' });
    }
  }
};

export default storeCommand;
