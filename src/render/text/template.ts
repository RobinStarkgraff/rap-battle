/**
 * Text templates with `{name}` slots, filled with stage and crew names (§11 Battle text).
 * Lines are picked with a seeded RNG, so both peers see the same ones.
 */

import type { Rng } from '../../core';

/** The slots a template may use. */
export const SLOTS = [
  'speaker',
  'target',
  'crew',
  'enemyCrew',
  'ability',
  'winner',
  'loser',
  'mvp',
] as const;
export type Slot = (typeof SLOTS)[number];

export type SlotValues = Partial<Readonly<Record<Slot, string>>>;

const SLOT_PATTERN = /\{(\w+)\}/g;

/** The slots a template uses, in order of appearance. */
export function slotsOf(template: string): string[] {
  return [...template.matchAll(SLOT_PATTERN)].map((match) => match[1] ?? '');
}

/**
 * Fills every slot of the template. Throws if a slot has no value, because a template that
 * shows `{target}` on screen is a bug in the caller or the table.
 */
export function fillTemplate(template: string, values: SlotValues): string {
  return template.replace(SLOT_PATTERN, (_, name: string) => {
    const value = isSlot(name) ? values[name] : undefined;
    if (value === undefined)
      throw new RangeError(`fillTemplate: no value for {${name}} in "${template}"`);
    return value;
  });
}

/** Picks a template with the RNG and fills it. */
export function pickLine(rng: Rng, templates: readonly string[], values: SlotValues): string {
  return fillTemplate(rng.pick(templates), values);
}

function isSlot(name: string): name is Slot {
  return (SLOTS as readonly string[]).includes(name);
}
