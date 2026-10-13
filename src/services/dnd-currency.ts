import { DndCurrency } from '@prisma/client'

export const CURRENCIES: Record<
  DndCurrency,
  { label: string; singular: string }
> = {
  CP: { label: 'copper pieces (cp)', singular: 'copper piece' },
  SP: { label: 'silver pieces (sp)', singular: 'silver piece' },
  GP: { label: 'gold pieces (gp)', singular: 'gold piece' },
  EL: { label: 'electrum pieces (el)', singular: 'electrum piece' },
  PC: { label: 'platinum pieces (pc)', singular: 'platinum piece' }
}

export type CoinAmounts = Partial<Record<DndCurrency, bigint>>

const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n
const COIN_TOKEN =
  /(\d+)\s*(copper|cp|silver|sp|gold|gp|electrum|e|platinum|pc)/gi

/** Parses compact D&D coin notation, such as "20sp 10gp 5e". */
export function parseCoinNotation(input: string): CoinAmounts {
  if (!input.trim())
    throw new Error('Enter at least one coin amount, such as `20sp 10gp 5e`.')

  const amounts: CoinAmounts = {}
  let cursor = 0
  let match: RegExpExecArray | null
  COIN_TOKEN.lastIndex = 0
  while ((match = COIN_TOKEN.exec(input)) !== null) {
    if (!/^[\s,]*$/.test(input.slice(cursor, match.index))) {
      throw new Error(
        'Use whole positive amounts followed by copper/cp, silver/sp, gold/gp, electrum/e, or platinum/pc.'
      )
    }

    const amount = BigInt(match[1])
    if (amount <= 0n) throw new Error('Coin amounts must be greater than zero.')

    const denomination = match[2].toLowerCase()
    const currency =
      denomination === 'copper' || denomination === 'cp'
        ? DndCurrency.CP
        : denomination === 'silver' || denomination === 'sp'
          ? DndCurrency.SP
          : denomination === 'gold' || denomination === 'gp'
            ? DndCurrency.GP
            : denomination === 'electrum' || denomination === 'e'
              ? DndCurrency.EL
              : DndCurrency.PC
    const combined = (amounts[currency] ?? 0n) + amount
    if (combined > POSTGRES_BIGINT_MAX)
      throw new Error('That coin total is too large to store.')
    amounts[currency] = combined
    cursor = COIN_TOKEN.lastIndex
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
        CURRENCIES_ORDER.indexOf(left) - CURRENCIES_ORDER.indexOf(right)
    )
}

const CURRENCIES_ORDER = [
  DndCurrency.PC,
  DndCurrency.GP,
  DndCurrency.EL,
  DndCurrency.SP,
  DndCurrency.CP
]

export function formatCoins(amount: bigint): string {
  return new Intl.NumberFormat('en-US').format(amount)
}

export function formatCoinEntries(entries: Array<[DndCurrency, bigint]>): string {
  return entries.map(([currency, amount]) => `${formatCoins(amount)} ${currency.toLowerCase()}`).join(', ')
}
