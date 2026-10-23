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

export type CharacterSheetField = {
  key: string
  label: string
  kind: 'text' | 'integer' | 'structured'
  editable?: boolean
  min?: number
  max?: number
  detail?: boolean
}

/** One schema drives PDF extraction, editing, and character-sheet presentation. */
export const CHARACTER_SHEET_FIELDS = [
  { key: 'name', label: 'Name', kind: 'text', editable: true },
  { key: 'class', label: 'Class', kind: 'text', editable: true },
  { key: 'species', label: 'Species / race', kind: 'text', editable: true },
  { key: 'background', label: 'Background', kind: 'text', editable: true },
  {
    key: 'level',
    label: 'Level',
    kind: 'integer',
    editable: true,
    min: 0,
    max: 10000
  },
  {
    key: 'armor_class',
    label: 'Armor class',
    kind: 'integer',
    editable: true,
    min: 0,
    max: 10000
  },
  {
    key: 'dexterity',
    label: 'Dexterity score',
    kind: 'integer',
    editable: true,
    min: 1,
    max: 30
  },
  {
    key: 'dexterity_modifier',
    label: 'Dexterity modifier',
    kind: 'integer',
    editable: true,
    min: -10,
    max: 20
  },
  {
    key: 'hp_current',
    label: 'Current hit points',
    kind: 'integer',
    editable: true,
    min: 0,
    max: 10000
  },
  {
    key: 'hp_max',
    label: 'Maximum hit points',
    kind: 'integer',
    editable: true,
    min: 1,
    max: 10000
  },
  { key: 'abilities', label: 'Abilities', kind: 'structured', detail: true },
  { key: 'skills', label: 'Skills', kind: 'structured', detail: true },
  { key: 'equipment', label: 'Equipment', kind: 'structured', detail: true },
  { key: 'features', label: 'Features', kind: 'structured', detail: true },
  { key: 'other', label: 'Other', kind: 'structured', detail: true }
] as const satisfies readonly CharacterSheetField[]

export const CHARACTER_EDITABLE_FIELDS = CHARACTER_SHEET_FIELDS.filter(
  (field) => 'editable' in field && field.editable
)
export const CHARACTER_DETAIL_FIELDS = CHARACTER_SHEET_FIELDS.filter(
  (field) => 'detail' in field && field.detail
)
export const CHARACTER_IMPORT_FIELD_KEYS = CHARACTER_SHEET_FIELDS.map(
  (field) => field.key
)
export const CHARACTER_NUMERIC_FIELDS: ReadonlySet<string> = new Set(
  CHARACTER_EDITABLE_FIELDS.filter((field) => field.kind === 'integer').map(
    (field) => field.key
  )
)

export const CHARACTER_HP_ACTION = {
  damage: 'damage',
  heal: 'heal',
  set: 'set'
} as const

export const CHARACTER_HP_ACTIONS = [
  { name: 'Take damage', value: CHARACTER_HP_ACTION.damage },
  { name: 'Heal', value: CHARACTER_HP_ACTION.heal },
  { name: 'Set current HP', value: CHARACTER_HP_ACTION.set }
] as const

export const CHARACTER_SUMMARY_LINES = [
  [
    { label: 'Class', keys: ['class'] },
    { label: 'Species', keys: ['species'] },
    { label: 'Level', keys: ['level'] }
  ],
  [
    { label: 'HP', keys: ['hp_current', 'hp_max'], separator: ' / ' },
    { label: 'AC', keys: ['armor_class'] }
  ],
  [{ label: 'Background', keys: ['background'] }]
] as const

export const CHARACTER_LIMITS = {
  pdfBytes: 10 * 1024 * 1024,
  memoryCharacters: 1500,
  questionCharacters: 500,
  editableTextCharacters: 100,
  hpAmount: 10000,
  savedMemoryCharacters: 8000,
  promptMemoryCharacters: 2500,
  pdfPromptCharacters: 45000
} as const

export const CHARACTER_DISPLAY_LIMITS = {
  summaryCharacters: 3500,
  embedCharacters: 5600,
  embedSafetyMargin: 80,
  fieldCharacters: 1024,
  minimumFieldCharacters: 40,
  answerCharacters: 1800
} as const

export const CHARACTER_GENERATION_SETTINGS = {
  sheetExtraction: {
    temperature: 0,
    maxTokens: 1600,
    preserveExplicitTemperature: true
  },
  sheetQuestion: { temperature: 0.3, maxTokens: 320 }
} as const

/** Product copy and command metadata; validation/error replies stay with the command. */
export const CHARACTER_COMMAND_COPY = {
  command: {
    name: 'character',
    description: 'Keep your D&D character sheet and notes for this server.'
  },
  subcommands: {
    init: {
      name: 'init',
      description: 'Read a PDF character sheet and save it as your character.'
    },
    read: {
      name: 'read',
      description: 'Read your saved character sheet and notes.'
    },
    ask: {
      name: 'ask',
      description: 'Ask AI a question about your character sheet or notes.'
    },
    remember: {
      name: 'remember',
      description: 'Add a note to your character’s memory.'
    },
    hp: {
      name: 'hp',
      description: 'Track damage, healing, or your current hit points.'
    },
    change: {
      name: 'change',
      description: 'Change a field on your character sheet.'
    }
  },
  options: {
    pdf: {
      name: 'pdf',
      description: 'A searchable PDF character sheet (up to 10 MB).'
    },
    question: {
      name: 'question',
      description: 'What do you want to know about your character?'
    },
    note: {
      name: 'note',
      description: 'A fact, goal, promise, or detail to remember.'
    },
    action: { name: 'action', description: 'What happened?' },
    amount: {
      name: 'amount',
      description: 'Damage, healing, or new current HP.'
    },
    field: { name: 'field', description: 'Which field to change?' },
    value: { name: 'value', description: 'The new value for this field.' }
  }
} as const

export const CHARACTER_MESSAGES = {
  imported: (name: string, fileName: string) =>
    `Saved **${name}** from **${fileName}**. Use the /character read command to review it, or /character change to correct any field.`,
  defaultTitle: 'Your character',
  defaultImportedName: 'your character',
  privateToServer: (serverName: string) => `Private to you in ${serverName}.`,
  detailOmitted:
    ' Long details are shortened here; use /character ask for specifics.',
  rememberedNotes: 'Remembered notes',
  remembered: 'I’ll keep that with your character notes.',
  hpDamage: (amount: number) => `${amount} damage taken`,
  hpRestored: (amount: number) => `${amount} HP restored`,
  hpSet: 'Current HP updated',
  hpSummary: (current: number, maximum: number) =>
    `**${current} / ${maximum} HP**`,
  fieldUpdated: (field: string) =>
    `Updated **${field}** on your character sheet.`
} as const
