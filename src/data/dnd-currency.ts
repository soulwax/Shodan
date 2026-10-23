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

export const COIN_DENOMINATION_PATTERN =
  /(\d+)\s*(copper|cp|silver|sp|gold|gp|electrum|e|platinum|pc)/gi

export const COIN_DENOMINATIONS: Readonly<Record<string, DndCurrency>> = {
  copper: DndCurrency.CP,
  cp: DndCurrency.CP,
  silver: DndCurrency.SP,
  sp: DndCurrency.SP,
  gold: DndCurrency.GP,
  gp: DndCurrency.GP,
  electrum: DndCurrency.EL,
  e: DndCurrency.EL,
  platinum: DndCurrency.PC,
  pc: DndCurrency.PC
}

export const COIN_FORMAT_ORDER: readonly DndCurrency[] = [
  DndCurrency.PC,
  DndCurrency.GP,
  DndCurrency.EL,
  DndCurrency.SP,
  DndCurrency.CP
]

export const BALANCE_CURRENCY_ORDER: readonly DndCurrency[] = [
  DndCurrency.CP,
  DndCurrency.SP,
  DndCurrency.GP,
  DndCurrency.EL,
  DndCurrency.PC
]
