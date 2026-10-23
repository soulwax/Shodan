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

export const ENCOUNTER_COMBATANT_KIND = {
  character: 'character',
  enemy: 'enemy'
} as const

export const ENCOUNTER_COMBATANT_KIND_CHOICES = [
  { name: 'Character', value: ENCOUNTER_COMBATANT_KIND.character },
  { name: 'Enemy', value: ENCOUNTER_COMBATANT_KIND.enemy }
] as const

export const ENCOUNTER_LIMITS = {
  combatants: 30,
  titleCharacters: 80,
  nameCharacters: 50,
  ideaCharacters: 200,
  initiativeMin: -100,
  initiativeMax: 100,
  automaticBonusMin: -20,
  automaticBonusMax: 20,
  joinBonusMin: -10,
  joinBonusMax: 20,
  hitPointsMax: 100000
} as const
