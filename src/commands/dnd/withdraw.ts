import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const withdrawCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Take gold out of your server’s adventurer bank.')
    .addIntegerOption(option => option
      .setName('gp')
      .setDescription('How many gold pieces should I release?')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(2_147_483_647)),
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
      const wallet = await prisma.dndWallet.findUnique({
        where: { campaignId_discordUserId: { campaignId: campaign.id, discordUserId: interaction.user.id } }
      });
      if (!wallet) {
        await interaction.editReply('Your vault is empty, so there’s nothing to withdraw.');
        return;
      }
      const result = await prisma.$transaction(async transaction => {
        const changed = await transaction.dndWallet.updateMany({
          where: { id: wallet.id, goldGp: { gte: amountGp } },
          data: { goldGp: { decrement: amountGp } }
        });
        if (changed.count === 0) return null;
        const updated = await transaction.dndWallet.findUniqueOrThrow({ where: { id: wallet.id } });
        await transaction.dndTransaction.create({
          data: {
            walletId: updated.id,
            discordInteractionId: interaction.id,
            type: 'WITHDRAWAL',
            amountGp,
            balanceAfterGp: updated.goldGp
          }
        });
        return updated;
      });
      if (!result) {
        await interaction.editReply('There isn’t enough gold in your vault for that withdrawal.');
        return;
      }
      const format = (amount: bigint) => new Intl.NumberFormat('en-US').format(amount);
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🪙 Gold withdrawn')
        .setDescription(`**${format(amountGp)} gp released to you.**\n\n**Left in your vault:** ${format(result.goldGp)} gp`)
        .setFooter({ text: `Your balance is kept separately in ${guild.name}.` });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('[D&D] Failed to withdraw gold:', error);
      await interaction.editReply('I couldn’t withdraw your gold just now. No withdrawal was made; please try again.');
    }
  }
};

export default withdrawCommand;
