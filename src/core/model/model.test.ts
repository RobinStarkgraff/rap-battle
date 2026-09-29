import { describe, expect, expectTypeOf, it } from 'vitest';
import { crew, mc, support } from '../testing/fixtures';
import {
  ABILITY_IDS,
  activeUnits,
  allMcs,
  allUnits,
  findUnit,
  LOGO_IDS,
  MAIN_COLOUR_IDS,
  MC_ARCHETYPE_IDS,
  replaceUnit,
  SUPPORT_ARCHETYPE_IDS,
  TRIGGER_KINDS,
  type BattleEvent,
  type McSlots,
  type UnitAbilities,
} from '.';

describe('id lists', () => {
  it.each([
    ['abilities', ABILITY_IDS, 32],
    ['MC archetypes', MC_ARCHETYPE_IDS, 5],
    ['support archetypes', SUPPORT_ARCHETYPE_IDS, 5],
    ['triggers', TRIGGER_KINDS, 8],
    ['main colours', MAIN_COLOUR_IDS, 10],
    ['logos', LOGO_IDS, 8],
  ] as const)('has %s without duplicates', (_name, ids, count) => {
    expect(ids).toHaveLength(count);
    expect(new Set(ids).size).toBe(count);
  });
});

describe('types', () => {
  it('allows one or two abilities per unit', () => {
    expectTypeOf<readonly []>().not.toExtend<UnitAbilities>();
    expectTypeOf<readonly [{ id: 'clapback'; power: 1 }]>().toExtend<UnitAbilities>();
    expectTypeOf<
      readonly [
        { id: 'clapback'; power: 1 },
        { id: 'encore'; power: 1 },
        { id: 'wordplay'; power: 1 },
      ]
    >().not.toExtend<UnitAbilities>();
  });

  it('keeps support units out of MC slots', () => {
    expectTypeOf<readonly [ReturnType<typeof support>, null, null]>().not.toExtend<McSlots>();
  });

  it('narrows battle events by kind', () => {
    expectTypeOf<Extract<BattleEvent, { kind: 'bar' }>['damage']>().toBeNumber();
  });
});

describe('crew units', () => {
  const opener = mc({ id: 'm1' });
  const closer = mc({ id: 'm3' });
  const dj = support({ id: 's2', abilities: ['scratch'] });
  const benchedMc = mc({ id: 'b1' });
  const benchedSupport = support({ id: 'b2', abilities: ['remix'] });
  const subject = crew({
    mcs: [opener, null, closer],
    supports: [null, dj],
    bench: [benchedMc, benchedSupport],
  });

  it('lists active units in resolution order, skipping empty slots', () => {
    expect(activeUnits(subject).map((unit) => unit.id)).toEqual(['m1', 'm3', 's2']);
  });

  it('lists all units with the bench last, and all MCs', () => {
    expect(allUnits(subject).map((unit) => unit.id)).toEqual(['m1', 'm3', 's2', 'b1', 'b2']);
    expect(allMcs(subject).map((unit) => unit.id)).toEqual(['m1', 'm3', 'b1']);
  });

  it('finds units anywhere in the crew', () => {
    expect(findUnit(subject, 'b2')).toBe(benchedSupport);
    expect(findUnit(subject, 'nobody')).toBeUndefined();
  });

  it('replaces a unit where it sits without touching the others', () => {
    const grown = { ...closer, flow: 9 };
    const updated = replaceUnit(subject, grown);
    expect(updated.mcSlots).toEqual([opener, null, grown]);
    expect(updated.supportSlots).toBe(subject.supportSlots);
    expect(updated.bench).toEqual(subject.bench);

    const benchGrown = { ...benchedSupport, xp: 4 };
    expect(replaceUnit(subject, benchGrown).bench).toEqual([benchedMc, benchGrown]);
    const djGrown = { ...dj, xp: 1 };
    expect(replaceUnit(subject, djGrown).supportSlots).toEqual([null, djGrown]);
  });

  it('refuses to replace a unit the crew does not have', () => {
    expect(() => replaceUnit(subject, mc({ id: 'stranger' }))).toThrow(RangeError);
    expect(() => replaceUnit(subject, support({ id: 'm1', abilities: ['remix'] }))).toThrow(
      RangeError,
    );
  });
});
