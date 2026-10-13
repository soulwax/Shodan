import { DndCurrency } from '@prisma/client';
import { CoinAmounts, coinAmountEntries } from './dnd-currency';

type WalletCoins = {
  copperCp: bigint;
  silverSp: bigint;
  goldGp: bigint;
  electrumEl: bigint;
  platinumPc: bigint;
};

export function walletCurrencyValue(wallet: WalletCoins, currency: DndCurrency): bigint {
  switch (currency) {
    case DndCurrency.CP: return wallet.copperCp;
    case DndCurrency.SP: return wallet.silverSp;
    case DndCurrency.GP: return wallet.goldGp;
    case DndCurrency.EL: return wallet.electrumEl;
    case DndCurrency.PC: return wallet.platinumPc;
    default: throw new Error(`Unsupported currency: ${currency}`);
  }
}

function walletCurrencyUpdate(currency: DndCurrency, amount: bigint, operation: 'increment' | 'decrement') {
  const change = operation === 'increment' ? { increment: amount } : { decrement: amount };
  switch (currency) {
    case DndCurrency.CP: return { copperCp: change };
    case DndCurrency.SP: return { silverSp: change };
    case DndCurrency.GP: return { goldGp: change };
    case DndCurrency.EL: return { electrumEl: change };
    case DndCurrency.PC: return { platinumPc: change };
    default: throw new Error(`Unsupported currency: ${currency}`);
  }
}

function walletCurrencyCreate(currency: DndCurrency, amount: bigint) {
  switch (currency) {
    case DndCurrency.CP: return { copperCp: amount };
    case DndCurrency.SP: return { silverSp: amount };
    case DndCurrency.GP: return { goldGp: amount };
    case DndCurrency.EL: return { electrumEl: amount };
    case DndCurrency.PC: return { platinumPc: amount };
    default: throw new Error(`Unsupported currency: ${currency}`);
  }
}

function walletCurrencyAtLeast(currency: DndCurrency, amount: bigint) {
  switch (currency) {
    case DndCurrency.CP: return { copperCp: { gte: amount } };
    case DndCurrency.SP: return { silverSp: { gte: amount } };
    case DndCurrency.GP: return { goldGp: { gte: amount } };
    case DndCurrency.EL: return { electrumEl: { gte: amount } };
    case DndCurrency.PC: return { platinumPc: { gte: amount } };
    default: throw new Error(`Unsupported currency: ${currency}`);
  }
}

export function walletCurrencyUpdates(amounts: CoinAmounts, operation: 'increment' | 'decrement') {
  return Object.fromEntries(
    coinAmountEntries(amounts).map(([currency, amount]) =>
      Object.entries(walletCurrencyUpdate(currency, amount, operation))[0]
    )
  );
}

export function walletCurrenciesAtLeast(amounts: CoinAmounts) {
  return Object.fromEntries(
    coinAmountEntries(amounts).map(([currency, amount]) =>
      Object.entries(walletCurrencyAtLeast(currency, amount))[0]
    )
  );
}

export function walletCurrencyCreates(amounts: CoinAmounts) {
  return Object.fromEntries(
    coinAmountEntries(amounts).map(([currency, amount]) =>
      Object.entries(walletCurrencyCreate(currency, amount))[0]
    )
  );
}
