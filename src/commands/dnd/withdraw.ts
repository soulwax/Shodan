import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { DndCurrency } from '@prisma/client';
import { CURRENCIES, coinAmountEntries, formatCoins, parseCoinNotation, walletCurrenciesAtLeast, walletCurrencyUpdates, walletCurrencyValue } from '../../services/dnd-currency';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

function formatEntries(entries: Array<[DndCurrency, bigint]>): string {
  return entries.map(([currency, amount]) => `${formatCoins(amount)} ${currency.toLowerCase()}`).join(', ');
}

const withdrawCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Take coins out of your server’s adventurer bank.')
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
      const wallet = await prisma.dndWallet.findUnique({
        where: { campaignId_discordUserId: { campaignId: campaign.id, discordUserId: interaction.user.id } }
      });
      if (!wallet) {
        await interaction.editReply('Your vault is empty, so there’s nothing to withdraw.');
        return;
      }
      const result = await prisma.$transaction(async transaction => {
        const changed = await transaction.dndWallet.updateMany({
          where: { id: wallet.id, ...walletCurrenciesAtLeast(amounts) },
          data: walletCurrencyUpdates(amounts, 'decrement')
        });
        if (changed.count === 0) return null;
        const updated = await transaction.dndWallet.findUniqueOrThrow({ where: { id: wallet.id } });
        await transaction.dndTransaction.createMany({
          data: entries.map(([currency, amount]) => ({
            walletId: updated.id,
            discordInteractionId: interaction.id,
            type: 'WITHDRAWAL' as const,
            amount,
            currency,
            balanceAfter: walletCurrencyValue(updated, currency)
          }))
        });
        return updated;
      });
      if (!result) {
        const requested = entries.map(([currency, amount]) => `${formatCoins(amount)} ${CURRENCIES[currency].label}`);
        await interaction.editReply(`Your vault doesn’t have enough for every part of that withdrawal (${requested.join('; ')}). Nothing was withdrawn.`);
        return;
      }
      const balances = entries.map(([currency]) => `**${currency.toLowerCase()} left:** ${formatCoins(walletCurrencyValue(result, currency))}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🪙 Coins withdrawn')
        .setDescription(`**${formatEntries(entries)} released to you.**\n\n${balances}`)
        .setFooter({ text: `Your balance is kept separately in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[D&D] Failed to withdraw coins:', error);
      await interaction.editReply('I couldn’t withdraw your coins just now. No withdrawal was made; please try again.');
    }
  }
};

export default withdrawCommand;
