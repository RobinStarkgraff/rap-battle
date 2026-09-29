import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from './data';
import { gainXp } from './growth';
import { createRng } from './rng';
import { mc, support } from './testing/fixtures';

describe('gainXp', () => {
  it('adds xp without growth below a growth step', () => {
    const result = gainXp(mc({ id: 'm', xp: 0 }), 2, createRng(1));
    expect(result.unit.xp).toBe(2);
    expect(result.events).toEqual([]);
  });

  it('gives an MC +1 flow or confidence at every GROWTH_XP', () => {
    const before = mc({ id: 'm', xp: 2, flow: 2, confidence: 3 });
    const { unit, events } = gainXp(before, 4, createRng(1));
    expect(unit.xp).toBe(6);
    expect(events).toHaveLength(2);
    expect(unit.flow + unit.confidence).toBe(before.flow + before.confidence + 2);
    for (const event of events) {
      expect(event).toMatchObject({ kind: 'statUp', unitId: 'm' });
    }
  });

  it('picks both stats over many seeds', () => {
    const stats = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const [event] = gainXp(mc({ id: 'm', xp: 2 }), 1, createRng(seed)).events;
      if (event?.kind === 'statUp') stats.add(event.stat);
    }
    expect([...stats].sort()).toEqual(['confidence', 'flow']);
  });

  it('gives a support unit +1 power, and nothing once every ability is maxed', () => {
    const dj = support({ id: 's', abilities: [['scratch', 2]], xp: 2 });
    const grown = gainXp(dj, 1, createRng(1));
    expect(grown.unit.abilities).toEqual([{ id: 'scratch', power: 3 }]);
    expect(grown.events).toEqual([
      { kind: 'powerUp', unitId: 's', abilityId: 'scratch', power: 3 },
    ]);
    const maxed = gainXp(grown.unit, 3, createRng(1));
    expect(maxed.unit.abilities).toEqual([{ id: 'scratch', power: 3 }]);
    expect(maxed.events).toEqual([]);
  });

  it('raises only abilities below MAX_POWER', () => {
    const dj = support({ id: 's', abilities: [['scratch', 3], 'crowd-mix'], xp: 2 });
    const { unit } = gainXp(dj, 1, createRng(5));
    expect(unit.abilities).toEqual([
      { id: 'scratch', power: 3 },
      { id: 'crowd-mix', power: 2 },
    ]);
  });

  it('learns a second ability from its pool at SECOND_ABILITY_XP, after the growth step', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { unit, events } = gainXp(
        mc({ id: 'm', archetype: 'lyricist', abilities: ['wordplay'], xp: 11 }),
        1,
        createRng(seed),
      );
      expect(events.map((event) => event.kind)).toEqual(['statUp', 'learn']);
      const [first, second] = unit.abilities;
      expect(first).toEqual({ id: 'wordplay', power: 1 });
      expect(second?.power).toBe(1);
      expect(second?.id).not.toBe('wordplay');
      expect(ARCHETYPES.lyricist.abilityPool).toContain(second?.id);
    }
  });

  it('learns no third ability', () => {
    const veteran = mc({ id: 'm', abilities: ['battle-kid', 'clapback'], xp: 11 });
    const { unit } = gainXp(veteran, 1, createRng(1));
    expect(unit.abilities).toHaveLength(2);
  });

  it('applies every step it passes in one gain', () => {
    const { unit, events } = gainXp(support({ id: 's', abilities: ['remix'] }), 12, createRng(3));
    expect(unit.xp).toBe(12);
    expect(unit.abilities).toHaveLength(2);
    // Steps at 3, 6, 9 and 12, then the second ability; the first steps take remix to 3.
    expect(events.filter((event) => event.kind === 'powerUp')).toHaveLength(2);
    expect(events.at(-1)?.kind).toBe('learn');
  });

  it('is deterministic and rejects bad amounts', () => {
    const unit = mc({ id: 'm', xp: 0 });
    expect(gainXp(unit, 12, createRng(8))).toEqual(gainXp(unit, 12, createRng(8)));
    expect(() => gainXp(unit, -1, createRng(1))).toThrow(RangeError);
    expect(() => gainXp(unit, 1.5, createRng(1))).toThrow(RangeError);
  });
});
