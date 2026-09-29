/**
 * Development pages: `?gallery` shows the art, `?battle` plays a battle between two generated
 * crews. Only development builds open them.
 */

import type Phaser from 'phaser';
import {
  botIdentity,
  createRng,
  foundCrew,
  generateUnit,
  nameSet,
  simulateBattle,
  type Crew,
  type McUnit,
  type SupportUnit,
} from '../core';
import { BattleScene, GalleryScene, type BattleSceneData } from '../render';

export type DevPage = 'gallery' | 'battle';

export function devPage(search: string): DevPage | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(search);
  if (params.has('gallery')) return 'gallery';
  return params.has('battle') ? 'battle' : null;
}

/** Starts a development page in a game that has its scenes registered. */
export function startDevPage(game: Phaser.Game, page: DevPage, search: string): void {
  if (page === 'gallery') {
    game.scene.add(GalleryScene.KEY, GalleryScene, true);
    return;
  }
  game.scene.add(BattleScene.KEY, BattleScene, false);
  const seed = Number(new URLSearchParams(search).get('battle')) || 1;
  const play = (round: number): void => {
    game.scene.start(
      BattleScene.KEY,
      demoBattle(seed + round, () => {
        play(round + 1);
      }),
    );
  };
  play(0);
}

/** A battle between two crews of generated units, full lineups, from a seed. */
export function demoBattle(seed: number, onDone: () => void): BattleSceneData {
  const rng = createRng(seed);
  const names = nameSet([]);
  const taken = nameSet([]);
  const crew = (number: number): Crew => {
    const identity = botIdentity(seed, number, taken);
    taken.add(identity.name);
    const mcs: McUnit[] = [];
    const supports: SupportUnit[] = [];
    for (let index = 0; mcs.length < 3 || supports.length < 2; index++) {
      const unit = {
        ...generateUnit(`c${String(number)}u${String(index)}`, rng, names),
        xp: rng.int(0, 14),
      };
      names.add(unit.stageName);
      if (unit.role === 'mc' && mcs.length < 3) mcs.push(unit);
      if (unit.role === 'support' && supports.length < 2) supports.push(unit);
    }
    return {
      ...foundCrew(`c${String(number)}`, identity),
      mcSlots: [mcs[0] ?? null, mcs[1] ?? null, mcs[2] ?? null],
      supportSlots: [supports[0] ?? null, supports[1] ?? null],
    };
  };
  const a = crew(1);
  const b = crew(2);
  return { crews: { a, b }, events: simulateBattle(a, b, seed), seed, onDone };
}
