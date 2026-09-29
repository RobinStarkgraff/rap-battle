import { describe, expect, it } from 'vitest';
import { allMcs, findUnit, type McUnit } from '../model';
import { createRng } from '../rng';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { applySignAbilities, applyUpkeepAbilities } from './outOfBattle';

function mcIn(subject: ReturnType<typeof crew>, id: string): McUnit {
  const unit = findUnit(subject, id);
  if (unit?.role !== 'mc') throw new Error(`no MC ${id}`);
  return unit;
}

describe('applySignAbilities', () => {
  it('Feature Verse gives another random MC of the crew +1 confidence for good', () => {
    const signed = mc({ id: 'new', archetype: 'hitmaker', abilities: ['feature-verse'] });
    const benched = plainMc('bench', 2, 3);
    const subject = crew({ mcs: [signed], bench: [benched] });
    const { crew: after, events } = applySignAbilities(subject, 'new', createRng(1));
    expect(mcIn(after, 'bench').confidence).toBe(4);
    expect(mcIn(after, 'new').confidence).toBe(signed.confidence);
    expect(events).toEqual([
      { kind: 'ability', unitId: 'new', abilityId: 'feature-verse' },
      {
        kind: 'buff',
        unitId: 'new',
        abilityId: 'feature-verse',
        targetId: 'bench',
        flow: 0,
        confidence: 1,
      },
    ]);
  });

  it('triggers for a unit signed onto the bench, and does nothing alone', () => {
    const signed = mc({ id: 'new', archetype: 'hitmaker', abilities: ['feature-verse'] });
    const subject = crew({ bench: [signed] });
    const { crew: after, events } = applySignAbilities(subject, 'new', createRng(1));
    expect(after).toEqual(subject);
    expect(events).toEqual([{ kind: 'ability', unitId: 'new', abilityId: 'feature-verse' }]);
  });

  it('ignores abilities with other triggers and refuses unknown units', () => {
    const subject = crew({ mcs: [mc({ id: 'm', abilities: ['clapback'] })] });
    expect(applySignAbilities(subject, 'm', createRng(1)).events).toEqual([]);
    expect(() => applySignAbilities(subject, 'ghost', createRng(1))).toThrow(RangeError);
  });
});

describe('applyUpkeepAbilities', () => {
  it('Negotiator adds gold by power, without the wallet cap', () => {
    const manager = support({ id: 'boss', archetype: 'manager', abilities: [['negotiator', 3]] });
    const { crew: after } = applyUpkeepAbilities(
      crew({ supports: [manager], wallet: 20 }),
      createRng(1),
    );
    expect(after.wallet).toBe(23);
  });

  it('Voice Lessons gives a random crew MC (stage or bench) confidence for good', () => {
    const coach = support({ id: 'c', archetype: 'vocal-coach', abilities: ['voice-lessons'] });
    const targets = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const subject = crew({
        mcs: [plainMc('m1', 2, 3)],
        supports: [coach],
        bench: [plainMc('m2', 2, 3)],
      });
      const { crew: after } = applyUpkeepAbilities(subject, createRng(seed));
      const gained = allMcs(after).filter((unit) => unit.confidence === 4);
      expect(gained).toHaveLength(1);
      targets.add(gained[0]?.id ?? '');
    }
    expect([...targets].sort()).toEqual(['m1', 'm2']);
  });

  it('Studio Session gives xp and applies growth at once', () => {
    const producer = support({
      id: 'p',
      archetype: 'producer',
      abilities: [['studio-session', 3]],
    });
    const subject = crew({ mcs: [mc({ id: 'm', xp: 2 })], supports: [producer] });
    const { crew: after, events } = applyUpkeepAbilities(subject, createRng(1));
    expect(mcIn(after, 'm').xp).toBe(5);
    expect(events.map((event) => event.kind)).toEqual(['ability', 'xp', 'statUp']);
  });

  it('skips benched units and resolves in slot order', () => {
    const negotiator = (id: string) =>
      support({ id, archetype: 'manager', abilities: ['negotiator'] });
    const subject = crew({
      supports: [negotiator('s1'), negotiator('s2')],
      bench: [negotiator('benched')],
    });
    const { crew: after, events } = applyUpkeepAbilities(subject, createRng(1));
    expect(after.wallet).toBe(2);
    expect(events.filter((event) => event.kind === 'ability').map((event) => event.unitId)).toEqual(
      ['s1', 's2'],
    );
  });

  it('resolves both abilities of a unit in learned order', () => {
    const manager = support({
      id: 'boss',
      archetype: 'manager',
      abilities: ['negotiator', 'hometown-crowd'],
    });
    const producer = support({
      id: 'p',
      archetype: 'producer',
      abilities: ['remix', 'studio-session'],
    });
    const subject = crew({ mcs: [mc({ id: 'm' })], supports: [manager, producer] });
    const { events } = applyUpkeepAbilities(subject, createRng(1));
    expect(
      events.filter((event) => event.kind === 'ability').map((event) => event.abilityId),
    ).toEqual(['negotiator', 'studio-session']);
  });
});
