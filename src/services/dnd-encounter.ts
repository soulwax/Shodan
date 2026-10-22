import { Prisma } from '@prisma/client';
import { randomUuid } from '../utils/random';

export type EncounterCombatant = {
  id: string;
  name: string;
  initiative: number;
  kind: 'character' | 'enemy';
  hp: number | null;
  maxHp: number | null;
  discordUserId?: string;
};

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) return Number(value);
  return null;
}

function abilityEntry(abilities: unknown): unknown {
  if (!abilities || typeof abilities !== 'object') return undefined;
  if (Array.isArray(abilities)) {
    return abilities.find(item => item && typeof item === 'object' &&
      ['dex', 'dexterity'].includes(String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).ability ?? '').toLowerCase()));
  }
  const values = abilities as Record<string, unknown>;
  return values.dexterity ?? values.DEX ?? values.dex ?? values.Dexterity;
}

/** Reads a Dexterity modifier from common character-sheet JSON shapes. */
export function dexterityModifier(sheet: unknown): number | null {
  if (!sheet || typeof sheet !== 'object' || Array.isArray(sheet)) return null;
  const fields = sheet as Record<string, unknown>;
  const ability = abilityEntry(fields.abilities);
  const direct = fields.dexterity_modifier ?? fields.dex_modifier ?? fields.dexterityMod ?? fields.dexMod;
  const candidates = [direct, ability && typeof ability === 'object' && !Array.isArray(ability)
    ? (ability as Record<string, unknown>).modifier ?? (ability as Record<string, unknown>).mod
    : undefined];
  for (const candidate of candidates) {
    const modifier = numeric(candidate);
    if (modifier !== null && modifier >= -10 && modifier <= 20) return modifier;
  }

  const scoreCandidate = fields.dexterity ?? fields.dex ??
    (ability && typeof ability === 'object' && !Array.isArray(ability)
      ? (ability as Record<string, unknown>).score ?? (ability as Record<string, unknown>).value
      : ability);
  const score = numeric(scoreCandidate);
  return score !== null && score >= 1 && score <= 30 ? Math.floor((score - 10) / 2) : null;
}

export function readCombatants(value: Prisma.JsonValue): EncounterCombatant[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Prisma.JsonObject =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
  ).map(item => ({
    id: typeof item.id === 'string' ? item.id : randomUuid(),
    name: typeof item.name === 'string' ? item.name : 'Unknown combatant',
    initiative: typeof item.initiative === 'number' ? item.initiative : 0,
    kind: item.kind === 'enemy' ? 'enemy' : 'character',
    hp: typeof item.hp === 'number' ? item.hp : null,
    maxHp: typeof item.maxHp === 'number' ? item.maxHp : null,
    ...(typeof item.discordUserId === 'string' ? { discordUserId: item.discordUserId } : {})
  }));
}

export function orderedCombatants(combatants: EncounterCombatant[]): EncounterCombatant[] {
  return [...combatants].sort((left, right) => right.initiative - left.initiative);
}

export function toJson(combatants: EncounterCombatant[]): Prisma.InputJsonValue {
  return combatants as unknown as Prisma.InputJsonValue;
}

export function combatantId(): string {
  return randomUuid();
}

export function formatCombatant(combatant: EncounterCombatant): string {
  const hp = combatant.hp === null
    ? ''
    : ` · ${combatant.hp}${combatant.maxHp === null ? '' : `/${combatant.maxHp}`} HP`;
  return `**${combatant.name}** · Init ${combatant.initiative}${hp}`;
}
