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

import { DndCurrency } from '@prisma/client'
import {
  COIN_DENOMINATIONS,
  COIN_DENOMINATION_PATTERN,
  COIN_FORMAT_ORDER
} from '../data/dnd-currency'

export { CURRENCIES } from '../data/dnd-currency'

export type CoinAmounts = Partial<Record<DndCurrency, bigint>>

const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n
/** Parses compact D&D coin notation, such as "20sp 10gp 5e". */
export function parseCoinNotation(input: string): CoinAmounts {
  if (!input.trim())
    throw new Error('Enter at least one coin amount, such as `20sp 10gp 5e`.')

  const amounts: CoinAmounts = {}
  let cursor = 0
  let match: RegExpExecArray | null
  COIN_DENOMINATION_PATTERN.lastIndex = 0
  while ((match = COIN_DENOMINATION_PATTERN.exec(input)) !== null) {
    if (!/^[\s,]*$/.test(input.slice(cursor, match.index))) {
      throw new Error(
        'Use whole positive amounts followed by copper/cp, silver/sp, gold/gp, electrum/e, or platinum/pc.'
      )
    }

    const amount = BigInt(match[1])
    if (amount <= 0n) throw new Error('Coin amounts must be greater than zero.')

    const denomination = match[2].toLowerCase()
    const currency = COIN_DENOMINATIONS[denomination]
    const combined = (amounts[currency] ?? 0n) + amount
    if (combined > POSTGRES_BIGINT_MAX)
      throw new Error('That coin total is too large to store.')
    amounts[currency] = combined
    cursor = COIN_DENOMINATION_PATTERN.lastIndex
  }

  if (cursor === 0 || !/^[\s,]*$/.test(input.slice(cursor))) {
    throw new Error(
      'Use whole positive amounts followed by copper/cp, silver/sp, gold/gp, electrum/e, or platinum/pc.'
    )
  }
  return amounts
}

export function coinAmountEntries(
  amounts: CoinAmounts
): Array<[DndCurrency, bigint]> {
  return Object.entries(amounts)
    .filter((entry): entry is [DndCurrency, bigint] => entry[1] !== undefined)
    .sort(
    ([left], [right]) =>
        COIN_FORMAT_ORDER.indexOf(left) - COIN_FORMAT_ORDER.indexOf(right)
    )
}

export function formatCoins(amount: bigint): string {
  return new Intl.NumberFormat('en-US').format(amount)
}

export function formatCoinEntries(entries: Array<[DndCurrency, bigint]>): string {
  return entries.map(([currency, amount]) => `${formatCoins(amount)} ${currency.toLowerCase()}`).join(', ')
}
