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
