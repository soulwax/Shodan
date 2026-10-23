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

export function randomInteger(minInclusive: number, maxInclusive: number): number
export function randomIndex(length: number): number
export function randomBoolean(): boolean
export function coinFlip(): 'Heads' | 'Tails'
export function rollDie(numSides: number): number
export function randomUuid(): string
export function randomBytes(byteLength: number): Buffer
