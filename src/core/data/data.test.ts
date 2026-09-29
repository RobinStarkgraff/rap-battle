import { describe, expect, it } from 'vitest';
import {
  ABILITY_IDS,
  CREW_TARGETS,
  ENEMY_TARGETS,
  FRIEND_TARGETS,
  MC_SLOTS,
  MC_TRIGGER_KINDS,
  SUBJECTS,
  TRIGGER_KINDS,
  type AbilityDef,
  type Target,
} from '../model';
import { ABILITIES, ARCHETYPES, MC_ARCHETYPES, SUPPORT_ARCHETYPES } from '.';
import {
  BOT_CREW_ADJECTIVES,
  BOT_CREW_NOUNS,
  SHARED_NAME_PREFIXES,
  SHARED_NAME_WORDS,
} from './names';

const abilities: readonly AbilityDef[] = Object.values(ABILITIES);
const archetypes = Object.values(ARCHETYPES);

function targetOf(ability: AbilityDef): Target | undefined {
  return ability.effect.kind === 'gold' ? undefined : ability.effect.target;
}

describe('abilities', () => {
  it('has exactly one entry per ability id, keyed by its id', () => {
    expect(Object.keys(ABILITIES).sort()).toEqual([...ABILITY_IDS].sort());
    for (const [id, ability] of Object.entries(ABILITIES)) {
      expect(ability.id).toBe(id);
    }
  });

  it('uses every trigger', () => {
    const used = new Set(abilities.map((ability) => ability.trigger.kind));
    expect([...used].sort()).toEqual([...TRIGGER_KINDS].sort());
  });

  it.each(MC_TRIGGER_KINDS)('uses every subject with %s', (kind) => {
    const subjects = new Set(
      abilities.flatMap((ability) =>
        ability.trigger.kind === kind && 'subject' in ability.trigger
          ? [ability.trigger.subject]
          : [],
      ),
    );
    expect([...subjects].sort()).toEqual([...SUBJECTS].sort());
  });

  it('uses every position condition and oncePerBattle', () => {
    const slots = new Set(abilities.map((ability) => ability.conditions?.inSlot));
    for (const slot of MC_SLOTS) {
      expect(slots).toContain(slot);
    }
    expect(abilities.some((ability) => ability.conditions?.oncePerBattle === true)).toBe(true);
  });

  it('uses every target and effect', () => {
    const targets = new Set(abilities.map(targetOf));
    for (const target of [...FRIEND_TARGETS, ...ENEMY_TARGETS, ...CREW_TARGETS]) {
      expect(targets, target).toContain(target);
    }
    const effects = new Set(abilities.map((ability) => ability.effect.kind));
    expect(effects.size).toBe(5);
  });

  it('gives MC abilities one value, since MCs never gain power', () => {
    for (const ability of abilities.filter((each) => each.role === 'mc')) {
      const { effect } = ability;
      const amounts = effect.kind === 'buff' ? [effect.flow, effect.confidence] : [effect.amount];
      for (const amount of amounts) {
        if (amount === undefined) continue;
        const [power1, power2, power3] = amount.byPower;
        expect([power2, power3], ability.id).toEqual([power1, power1]);
      }
    }
  });

  it('never lets support units listen to their own MC events', () => {
    for (const ability of abilities.filter((each) => each.role === 'support')) {
      if ('subject' in ability.trigger) {
        expect(ability.trigger.subject, ability.id).toBe('friend');
      }
    }
  });

  it('keeps position conditions on MC abilities only', () => {
    for (const ability of abilities.filter((each) => each.conditions?.inSlot !== undefined)) {
      expect(ability.role, ability.id).toBe('mc');
    }
  });

  it('makes every ability that answers hurt with a diss oncePerBattle (§9)', () => {
    for (const ability of abilities) {
      if (ability.trigger.kind === 'hurt' && ability.effect.kind === 'diss') {
        expect(ability.conditions?.oncePerBattle, ability.id).toBe(true);
      }
    }
  });

  it('keeps crowd values out of sign and upkeep abilities, which never see hype', () => {
    for (const ability of abilities) {
      if (ability.trigger.kind !== 'sign' && ability.trigger.kind !== 'upkeep') continue;
      const { effect } = ability;
      const amounts = effect.kind === 'buff' ? [effect.flow, effect.confidence] : [effect.amount];
      for (const amount of amounts) {
        expect(amount?.hypeDivisor, ability.id).toBeUndefined();
      }
    }
  });
});

describe('archetypes', () => {
  it('has 5 MC and 5 support archetypes keyed by id', () => {
    expect(Object.keys(MC_ARCHETYPES)).toHaveLength(5);
    expect(Object.keys(SUPPORT_ARCHETYPES)).toHaveLength(5);
    for (const [id, archetype] of Object.entries(ARCHETYPES)) {
      expect(archetype.id).toBe(id);
    }
  });

  it('gives every archetype 4 abilities of its role, with the shared one of its role', () => {
    for (const archetype of archetypes) {
      expect(new Set(archetype.abilityPool).size, archetype.id).toBe(4);
      for (const id of archetype.abilityPool) {
        expect(ABILITIES[id].role, `${archetype.id}: ${id}`).toBe(archetype.role);
      }
      const shared = archetype.role === 'mc' ? 'clapback' : 'shout-out';
      expect(archetype.abilityPool).toContain(shared);
    }
  });

  it('puts every ability in some pool, and signature abilities in exactly one', () => {
    for (const id of ABILITY_IDS) {
      const pools = archetypes.filter((archetype) => archetype.abilityPool.includes(id));
      const shared = id === 'clapback' || id === 'shout-out';
      expect(pools.length, id).toBe(shared ? 5 : 1);
    }
  });

  it('has valid MC stat ranges', () => {
    for (const archetype of Object.values(MC_ARCHETYPES)) {
      for (const range of [archetype.flow, archetype.confidence]) {
        expect(range.min, archetype.id).toBeGreaterThanOrEqual(1);
        expect(range.max, archetype.id).toBeGreaterThanOrEqual(range.min);
      }
    }
  });
});

describe('name lists', () => {
  it('has no duplicate stage name words or prefixes across the lists', () => {
    const words = [...SHARED_NAME_WORDS, ...archetypes.flatMap((each) => each.nameWords)];
    expect(new Set(words).size).toBe(words.length);
    const prefixes = new Set(archetypes.flatMap((each) => each.namePrefixes));
    for (const prefix of SHARED_NAME_PREFIXES) {
      expect(prefixes).not.toContain(prefix);
    }
    expect(new Set(SHARED_NAME_PREFIXES).size).toBe(SHARED_NAME_PREFIXES.length);
  });

  it('gives every archetype 12 words and every MC the MC prefix', () => {
    for (const archetype of archetypes) {
      expect(archetype.nameWords, archetype.id).toHaveLength(12);
      expect(archetype.namePrefixes, archetype.id).toHaveLength(1);
    }
    for (const archetype of Object.values(MC_ARCHETYPES)) {
      expect(archetype.namePrefixes).toEqual(['MC']);
    }
  });

  it('has 12 bot crew adjectives and nouns without duplicates', () => {
    for (const list of [BOT_CREW_ADJECTIVES, BOT_CREW_NOUNS]) {
      expect(list).toHaveLength(12);
      expect(new Set(list).size).toBe(12);
    }
  });
});
