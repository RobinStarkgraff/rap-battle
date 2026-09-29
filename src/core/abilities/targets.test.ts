import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { ENEMY_TARGET_FNS, FRIEND_TARGET_FNS, type TargetView } from './targets';

function view(overrides: Partial<TargetView>): TargetView {
  return {
    selfId: 'a2',
    place: { index: 1, onStage: true },
    ownStage: ['a1', 'a2', 'a3'],
    enemyStage: ['b1', 'b2', 'b3'],
    triggeringId: null,
    crewMcs: ['a1', 'a2', 'a3', 'bench'],
    rng: createRng(1),
    ...overrides,
  };
}

describe('friend targets', () => {
  it('finds self only while it is on stage', () => {
    expect(FRIEND_TARGET_FNS.self(view({}))).toEqual(['a2']);
    expect(FRIEND_TARGET_FNS.self(view({ ownStage: ['a1', 'a3'] }))).toEqual([]);
  });

  it('finds the front friend', () => {
    expect(FRIEND_TARGET_FNS.frontFriend(view({}))).toEqual(['a1']);
    expect(FRIEND_TARGET_FNS.frontFriend(view({ ownStage: [] }))).toEqual([]);
  });

  it('finds the friends behind an MC on stage', () => {
    expect(FRIEND_TARGET_FNS.friendBehind(view({}))).toEqual(['a3']);
    expect(FRIEND_TARGET_FNS.allFriendsBehind(view({}))).toEqual(['a3']);
    const front = view({ selfId: 'a1', place: { index: 0, onStage: true } });
    expect(FRIEND_TARGET_FNS.allFriendsBehind(front)).toEqual(['a2', 'a3']);
    const last = view({ selfId: 'a3', place: { index: 2, onStage: true } });
    expect(FRIEND_TARGET_FNS.friendBehind(last)).toEqual([]);
  });

  it('uses the place a choked MC held: the MCs that closed up behind it', () => {
    // a1 choked at the front; a2 and a3 moved up.
    const choked = view({
      selfId: 'a1',
      place: { index: 0, onStage: false },
      ownStage: ['a2', 'a3'],
    });
    expect(FRIEND_TARGET_FNS.friendBehind(choked)).toEqual(['a2']);
    expect(FRIEND_TARGET_FNS.allFriendsBehind(choked)).toEqual(['a2', 'a3']);
    expect(FRIEND_TARGET_FNS.self(choked)).toEqual([]);
  });

  it('has no MCs behind a support unit', () => {
    const dj = view({ selfId: 'dj', place: null });
    expect(FRIEND_TARGET_FNS.friendBehind(dj)).toEqual([]);
    expect(FRIEND_TARGET_FNS.allFriendsBehind(dj)).toEqual([]);
  });

  it('finds the triggering friend only while it is on stage', () => {
    expect(FRIEND_TARGET_FNS.triggeringFriend(view({ triggeringId: 'a3' }))).toEqual(['a3']);
    expect(FRIEND_TARGET_FNS.triggeringFriend(view({ triggeringId: 'gone' }))).toEqual([]);
    expect(FRIEND_TARGET_FNS.triggeringFriend(view({}))).toEqual([]);
  });

  it('picks random friends from the right groups', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed);
      const [onStage] = FRIEND_TARGET_FNS.randomFriendOnStage(view({ rng }));
      expect(['a1', 'a2', 'a3']).toContain(onStage);
      const [other] = FRIEND_TARGET_FNS.randomOtherCrewMC(view({ rng }));
      expect(['a1', 'a3', 'bench']).toContain(other);
      const [any] = FRIEND_TARGET_FNS.randomCrewMC(view({ rng }));
      expect(['a1', 'a2', 'a3', 'bench']).toContain(any);
    }
    expect(FRIEND_TARGET_FNS.randomOtherCrewMC(view({ crewMcs: ['a2'] }))).toEqual([]);
    expect(FRIEND_TARGET_FNS.randomFriendOnStage(view({ ownStage: [] }))).toEqual([]);
  });
});

describe('enemy targets', () => {
  it('finds the front, the one behind it and all enemies in stage order', () => {
    expect(ENEMY_TARGET_FNS.enemyFront(view({}))).toEqual(['b1']);
    expect(ENEMY_TARGET_FNS.enemyBehindFront(view({}))).toEqual(['b2']);
    expect(ENEMY_TARGET_FNS.allEnemies(view({}))).toEqual(['b1', 'b2', 'b3']);
    expect(ENEMY_TARGET_FNS.enemyBehindFront(view({ enemyStage: ['b1'] }))).toEqual([]);
  });

  it('picks a random enemy on stage, or none', () => {
    const [target] = ENEMY_TARGET_FNS.randomEnemy(view({}));
    expect(['b1', 'b2', 'b3']).toContain(target);
    expect(ENEMY_TARGET_FNS.randomEnemy(view({ enemyStage: [] }))).toEqual([]);
  });

  it('picks the same random target for the same seed', () => {
    const pick = (seed: number) => ENEMY_TARGET_FNS.randomEnemy(view({ rng: createRng(seed) }));
    expect(pick(99)).toEqual(pick(99));
  });
});
