import { DndCurrency } from '@prisma/client';
import { prisma } from './prisma';
import {
  CoinAmounts,
  coinAmountEntries
} from './dnd-currency';
import {
  walletCurrenciesAtLeast,
  walletCurrencyCreates,
  walletCurrencyUpdates,
  walletCurrencyValue
} from './dnd-wallet-mapping';

type Wallet = NonNullable<Awaited<ReturnType<typeof prisma.dndWallet.findUnique>>>;

export type WithdrawCoinsResult =
  | { status: 'empty' }
  | { status: 'insufficient' }
  | { status: 'success'; wallet: Wallet };

export function getWallet(campaignId: string, discordUserId: string) {
  return prisma.dndWallet.findUnique({
    where: { campaignId_discordUserId: { campaignId, discordUserId } }
  });
}

export function depositCoins(input: {
  campaignId: string;
  discordUserId: string;
  interactionId: string;
  amounts: CoinAmounts;
  narration: string;
}) {
  const entries = coinAmountEntries(input.amounts);

  return prisma.$transaction(async transaction => {
    const wallet = await transaction.dndWallet.upsert({
      where: {
        campaignId_discordUserId: {
          campaignId: input.campaignId,
          discordUserId: input.discordUserId
        }
      },
      create: {
        campaignId: input.campaignId,
        discordUserId: input.discordUserId,
        ...walletCurrencyCreates(input.amounts)
      },
      update: walletCurrencyUpdates(input.amounts, 'increment')
    });

    await transaction.dndTransaction.createMany({
      data: entries.map(([currency, amount]) => ({
        walletId: wallet.id,
        discordInteractionId: input.interactionId,
        type: 'DEPOSIT' as const,
        amount,
        currency,
        balanceAfter: walletCurrencyValue(wallet, currency),
        narration: input.narration
      }))
    });
    return wallet;
  });
}

export async function withdrawCoins(input: {
  campaignId: string;
  discordUserId: string;
  interactionId: string;
  amounts: CoinAmounts;
}): Promise<WithdrawCoinsResult> {
  const wallet = await getWallet(input.campaignId, input.discordUserId);
  if (!wallet) return { status: 'empty' };

  const entries = coinAmountEntries(input.amounts);
  const result = await prisma.$transaction(async transaction => {
    const changed = await transaction.dndWallet.updateMany({
      where: { id: wallet.id, ...walletCurrenciesAtLeast(input.amounts) },
      data: walletCurrencyUpdates(input.amounts, 'decrement')
    });
    if (changed.count === 0) return null;

    const updated = await transaction.dndWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    await transaction.dndTransaction.createMany({
      data: entries.map(([currency, amount]) => ({
        walletId: updated.id,
        discordInteractionId: input.interactionId,
        type: 'WITHDRAWAL' as const,
        amount,
        currency,
        balanceAfter: walletCurrencyValue(updated, currency)
      }))
    });
    return updated;
  });

  return result ? { status: 'success', wallet: result } : { status: 'insufficient' };
}

export function getWalletCurrencies(wallet: Wallet, currencies: DndCurrency[]) {
  return currencies.map(currency => ({ currency, amount: walletCurrencyValue(wallet, currency) }));
}
