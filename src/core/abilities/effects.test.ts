import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../data';
import type { Effect, Power } from '../model';
import { createRng } from '../rng';
import { effectOps } from './effects';
import type { TargetView } from './targets';

const VIEW: TargetView = {
  selfId: 'a1',
  place: { index: 0, onStage: true },
  ownStage: ['a1', 'a2'],
  enemyStage: ['b1', 'b2', 'b3'],
  triggeringId: 'a2',
  crewMcs: ['a1', 'a2'],
  rng: createRng(1),
};

function ops(effect: Effect, power: Power = 1, hype = 0) {
  return effectOps(effect, { power, hype, view: VIEW });
}

describe('effectOps', () => {
  it('buffs each target with flow and confidence', () => {
    expect(ops(ABILITIES['street-poet'].effect)).toEqual([
      { op: 'buff', targetId: 'a2', flow: 2, confidence: 2 },
    ]);
    expect(ops(ABILITIES['drop-the-beat'].effect, 3)).toEqual([
      { op: 'buff', targetId: 'a2', flow: 3, confidence: 0 },
    ]);
  });

  it('adds the crowd to hype-based values', () => {
    expect(ops(ABILITIES['hype-wave'].effect, 2, 7)).toEqual([
      { op: 'buff', targetId: 'a1', flow: 2 + 1, confidence: 0 },
    ]);
  });

  it('disses each target, then cheers once', () => {
    expect(ops(ABILITIES.headliner.effect)).toEqual([
      { op: 'damage', targetId: 'b1', amount: 1 },
      { op: 'damage', targetId: 'b2', amount: 1 },
      { op: 'damage', targetId: 'b3', amount: 1 },
      { op: 'hype', crew: 'own', change: 1, cause: 'diss' },
    ]);
  });

  it('gives no cheer for a diss of 0 or a diss without a target', () => {
    expect(ops(ABILITIES.wordplay.effect, 1, 2)).toEqual([
      { op: 'damage', targetId: 'b1', amount: 0 },
    ]);
    const lonely = effectOps(ABILITIES.punchliner.effect, {
      power: 1,
      hype: 0,
      view: { ...VIEW, enemyStage: ['b1'] },
    });
    expect(lonely).toEqual([]);
  });

  it('gains own hype or drains the enemy', () => {
    expect(ops(ABILITIES['crowd-mix'].effect, 2)).toEqual([
      { op: 'hype', crew: 'own', change: 2, cause: 'ability' },
    ]);
    expect(ops(ABILITIES['paid-hecklers'].effect, 3)).toEqual([
      { op: 'hype', crew: 'enemy', change: -3, cause: 'ability' },
    ]);
  });

  it('gains gold and xp', () => {
    expect(ops(ABILITIES.negotiator.effect, 3)).toEqual([{ op: 'gold', amount: 2 }]);
    const [xp] = ops(ABILITIES['studio-session'].effect, 3);
    expect(xp).toMatchObject({ op: 'xp', amount: 2 });
  });
});
