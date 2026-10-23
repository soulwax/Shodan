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

export const IMAGE_NARRATION_STYLES = [
  {
    name: 'Nature documentary',
    value: 'documentary',
    voice:
      'A curious nature documentary narrator: observant, vivid, and gently amused.'
  },
  {
    name: 'Detective report',
    value: 'detective',
    voice:
      'A world-weary detective giving a playful case report, with one sharp observation.'
  },
  {
    name: 'Movie trailer',
    value: 'dramatic',
    voice:
      'A wildly dramatic movie-trailer narrator. Make the ordinary feel momentous.'
  },
  {
    name: 'Cozy friend',
    value: 'cozy',
    voice:
      'A friend describing the scene over a warm drink: relaxed, specific, and kind.'
  }
] as const

export type ImageNarrationStyle =
  (typeof IMAGE_NARRATION_STYLES)[number]['value']

export const DEFAULT_IMAGE_NARRATION_VOICE =
  'A quick-witted friend noticing the details everyone else missed.'

export const GENERATED_SPEECH_VOICES = [
  { name: 'Alloy', value: 'alloy' },
  { name: 'Coral', value: 'coral' },
  { name: 'Nova', value: 'nova' },
  { name: 'Onyx', value: 'onyx' }
] as const

export const DEFAULT_GENERATED_SPEECH_VOICE = 'coral'

export const COMPLIMENT_HISTORY_LIMITS = {
  recentPosts: 8,
  postCharacters: 400,
  databaseHistoryRead: 20,
  channelFetchBatch: 100
} as const
