import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getMainCampaign } from '../../services/dnd-campaign';
import { CURRENCIES, coinAmountEntries, formatCoinEntries, formatCoins, parseCoinNotation } from '../../services/dnd-currency';
import { withdrawCoins } from '../../services/dnd-wallet';
import { walletCurrencyValue } from '../../services/dnd-wallet-mapping';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

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
      const campaign = await getMainCampaign(guild.id, guild.name);
      const withdrawal = await withdrawCoins({
        campaignId: campaign.id,
        discordUserId: interaction.user.id,
        interactionId: interaction.id,
        amounts
      });
      if (withdrawal.status === 'empty') {
        await interaction.editReply('Your vault is empty, so there’s nothing to withdraw.');
        return;
      }
      if (withdrawal.status === 'insufficient') {
        const requested = entries.map(([currency, amount]) => `${formatCoins(amount)} ${CURRENCIES[currency].label}`);
        await interaction.editReply(`Your vault doesn’t have enough for every part of that withdrawal (${requested.join('; ')}). Nothing was withdrawn.`);
        return;
      }
      const result = withdrawal.wallet;
      const balances = entries.map(([currency]) => `**${currency.toLowerCase()} left:** ${formatCoins(walletCurrencyValue(result, currency))}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🪙 Coins withdrawn')
        .setDescription(`**${formatCoinEntries(entries)} released to you.**\n\n${balances}`)
        .setFooter({ text: `Your balance is kept separately in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[D&D] Failed to withdraw coins:', error);
      await interaction.editReply('I couldn’t withdraw your coins just now. No withdrawal was made; please try again.');
    }
  }
};

export default withdrawCommand;
