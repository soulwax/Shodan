import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

export type EncounterCombatant = {
  id: string;
  name: string;
  initiative: number;
  kind: 'character' | 'enemy';
  hp: number | null;
  maxHp: number | null;
};

export function readCombatants(value: Prisma.JsonValue): EncounterCombatant[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Prisma.JsonObject =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
  ).map(item => ({
    id: typeof item.id === 'string' ? item.id : randomUUID(),
    name: typeof item.name === 'string' ? item.name : 'Unknown combatant',
    initiative: typeof item.initiative === 'number' ? item.initiative : 0,
    kind: item.kind === 'enemy' ? 'enemy' : 'character',
    hp: typeof item.hp === 'number' ? item.hp : null,
    maxHp: typeof item.maxHp === 'number' ? item.maxHp : null
  }));
}

export function orderedCombatants(combatants: EncounterCombatant[]): EncounterCombatant[] {
  return [...combatants].sort((left, right) => right.initiative - left.initiative);
}

export function toJson(combatants: EncounterCombatant[]): Prisma.InputJsonValue {
  return combatants as unknown as Prisma.InputJsonValue;
}

export function combatantId(): string {
  return randomUUID();
}

export function formatCombatant(combatant: EncounterCombatant): string {
  const hp = combatant.hp === null
    ? ''
    : ` · ${combatant.hp}${combatant.maxHp === null ? '' : `/${combatant.maxHp}`} HP`;
  return `**${combatant.name}** · Init ${combatant.initiative}${hp}`;
}
