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

function fallbackNarration(amount: bigint): string {
  if (amount <= 10n) return 'The clerk barely pauses before adding it to the ledger.';
  if (amount >= 100_000n) return 'The clerk finds a suitably impressive place for the haul.';
  return 'The clerk counts it twice, then locks it away.';
}

async function narrateDeposit(amount: bigint): Promise<string> {
  const amountLabel = formatGold(amount);
  const scale = amount <= 10n ? 'a tiny handful' : amount >= 100_000n ? 'a tremendous haul' : 'a respectable deposit';
  try {
    const response = await getAIService().createChatCompletion([
      {
        role: 'system',
        content: `You are the friendly, slightly opinionated keeper of a fantasy adventurers' bank. Write one short, vivid line reacting to a deposit. The tone should feel like a Dungeon Master adding a bit of flavor at the table: natural, playful, and specific to the size of the deposit. For a tiny deposit, a dry little tease is welcome. For a huge deposit, use a memorable image such as red bags with gold rims. This is fictional narration, not a literal description of bank procedures. Do not repeat the amount, invent fees, change the balance, or use markdown. Keep it under 25 words.`
      },
      {
        role: 'user',
        content: `A player deposited ${amountLabel} gp (${scale}). Give the bankkeeper's one-line reaction.`
      }
    ], { temperature: 0.95, max_tokens: 80 });
    return response?.trim().slice(0, 300) || fallbackNarration(amount);
  } catch {
    logger.warn('[D&D] AI narration unavailable; using the standard deposit line.');
    return fallbackNarration(amount);
  }
}

const storeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('store')
    .setDescription('Put gold away in your server’s adventurer bank.')
    .addIntegerOption(option =>
      option
        .setName('gp')
        .setDescription('How many gold pieces should I store?')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(2_147_483_647)
    ),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'The adventurer bank is only available in a server.', ephemeral: true });
      return;
    }

    const amountGp = BigInt(interaction.options.getInteger('gp', true));
    await interaction.deferReply();

    try {
      const server = await prisma.dndServer.upsert({
        where: { discordId: guild.id },
        create: { discordId: guild.id, name: guild.name },
        update: { name: guild.name }
      });
      const campaign = await prisma.dndCampaign.upsert({
        where: { serverId_name: { serverId: server.id, name: 'Main Campaign' } },
        create: { serverId: server.id, name: 'Main Campaign', isDefault: true },
        update: {}
      });
      const narration = server.aiNarrationEnabled
        ? await narrateDeposit(amountGp)
        : fallbackNarration(amountGp);
      const result = await prisma.$transaction(async transaction => {
        const wallet = await transaction.dndWallet.upsert({
          where: {
            campaignId_discordUserId: {
              campaignId: campaign.id,
              discordUserId: interaction.user.id
            }
          },
          create: {
            campaignId: campaign.id,
            discordUserId: interaction.user.id,
            goldGp: amountGp
          },
          update: { goldGp: { increment: amountGp } }
        });
        await transaction.dndTransaction.create({
          data: {
            walletId: wallet.id,
            discordInteractionId: interaction.id,
            type: 'DEPOSIT',
            amountGp,
            balanceAfterGp: wallet.goldGp,
            narration
          }
        });
        return wallet;
      });

      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🪙 Gold safely stowed')
        .setDescription(`**${formatGold(amountGp)} gp deposited.**\n${narration}\n\n**Your vault:** ${formatGold(result.goldGp)} gp`)
        .setFooter({ text: `Your balance is kept separately in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.error('[D&D] Failed to store gold:', error);
      await interaction.editReply({ content: 'I couldn’t store your gold just now. No deposit was made; please try again.' });
    }
  }
};

export default storeCommand;
