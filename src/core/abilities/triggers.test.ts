import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../data';
import { slotConditionMet, triggersOn } from './triggers';

describe('triggersOn', () => {
  it('matches crew moments by kind', () => {
    expect(triggersOn(ABILITIES['crowd-mix'], { kind: 'battleStart' }, 'dj')).toBe(true);
    expect(triggersOn(ABILITIES['crowd-mix'], { kind: 'beforeBattle' }, 'dj')).toBe(false);
    expect(triggersOn(ABILITIES['hometown-crowd'], { kind: 'beforeBattle' }, 'm')).toBe(true);
    expect(triggersOn(ABILITIES.negotiator, { kind: 'upkeep' }, 'm')).toBe(true);
    expect(triggersOn(ABILITIES['feature-verse'], { kind: 'sign' }, 'm')).toBe(true);
  });

  it('lets self abilities hear only their own MC', () => {
    const clapback = ABILITIES.clapback;
    expect(triggersOn(clapback, { kind: 'hurt', mcId: 'me' }, 'me')).toBe(true);
    expect(triggersOn(clapback, { kind: 'hurt', mcId: 'mate' }, 'me')).toBe(false);
    expect(triggersOn(clapback, { kind: 'choke', mcId: 'me' }, 'me')).toBe(false);
  });

  it('lets friend abilities hear every other MC of the crew', () => {
    const scratch = ABILITIES.scratch;
    expect(triggersOn(scratch, { kind: 'takeFront', mcId: 'mate' }, 'dj')).toBe(true);
    expect(triggersOn(scratch, { kind: 'takeFront', mcId: 'dj' }, 'dj')).toBe(false);
    expect(triggersOn(scratch, { kind: 'barLanded', mcId: 'mate' }, 'dj')).toBe(false);
  });
});

describe('slotConditionMet', () => {
  it('checks the starting slot', () => {
    expect(slotConditionMet(ABILITIES.headliner, 'opener')).toBe(true);
    expect(slotConditionMet(ABILITIES.headliner, 'middle')).toBe(false);
    expect(slotConditionMet(ABILITIES['long-verse'], 'middle')).toBe(true);
    expect(slotConditionMet(ABILITIES['off-the-top'], 'closer')).toBe(true);
    expect(slotConditionMet(ABILITIES['off-the-top'], null)).toBe(false);
  });

  it('always holds for abilities without a slot condition', () => {
    expect(slotConditionMet(ABILITIES.clapback, null)).toBe(true);
    expect(slotConditionMet(ABILITIES.clapback, 'closer')).toBe(true);
  });
});
