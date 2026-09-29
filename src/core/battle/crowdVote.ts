/**
 * The "crowd vote" battle style (§5.2, D-088): the same bars, abilities and chokes as the
 * clash, split into `VERSES` verses of `TURNS_PER_VERSE` turns. The crowd gives each verse to
 * the crew whose hype rose more in it, and the first crew to win most of the verses wins. A
 * wipeout still ends the battle at once.
 */

import type { BattleEvent, BattleLineup, Side } from '../model';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { openBattle, playTurn } from './opening';
import { changeHype } from './stage';
import { emit, endBattle, isOver, otherSide, type BattleState } from './state';
import type { BattleStyle } from './style';

export const CROWD_VOTE: BattleStyle = {
  id: 'crowdVote',
  name: 'Crowd vote',
  simulate: simulateCrowdVote,
};

/** Both crews' hype and confidence lost when a verse starts, to measure the verse by. */
interface VerseStart {
  readonly hype: Readonly<Record<Side, number>>;
  readonly lost: Readonly<Record<Side, number>>;
}

const VERSES_TO_WIN = Math.floor(TUNABLES.VERSES / 2) + 1;

function simulateCrowdVote(crewA: BattleLineup, crewB: BattleLineup, rng: Rng): BattleEvent[] {
  const state = openBattle(crewA, crewB, rng);
  const verses: Record<Side, number> = { a: 0, b: 0 };
  // The first verse counts from before the setup, so setup hype and disses count for it.
  let start: VerseStart = { hype: { a: 0, b: 0 }, lost: { a: 0, b: 0 } };
  let turn = 0;
  for (let verse = 1; verse <= TUNABLES.VERSES && !isOver(state); verse++) {
    emit(state, { kind: 'verse', verse });
    for (let step = 0; step < TUNABLES.TURNS_PER_VERSE && !isOver(state); step++) {
      turn += 1;
      playTurn(state, turn);
    }
    if (isOver(state)) break;
    const winner = verseWinner(state, start);
    verses[winner] += 1;
    emit(state, {
      kind: 'verdict',
      verse,
      winner,
      gain: { a: gain(state, start, 'a'), b: gain(state, start, 'b') },
      verses: { ...verses },
    });
    if (verses[winner] >= VERSES_TO_WIN) {
      endBattle(state, winner, 'crowdVote');
      break;
    }
    settleCrowd(state);
    start = snapshot(state);
  }
  return state.events;
}

/**
 * The crew whose hype rose more in the verse. If equal, the crew that took more confidence
 * off the enemy in the verse; if that is equal too, the crew that didn't open.
 */
function verseWinner(state: BattleState, start: VerseStart): Side {
  const gainA = gain(state, start, 'a');
  const gainB = gain(state, start, 'b');
  if (gainA !== gainB) return gainA > gainB ? 'a' : 'b';
  const dealtA = lostInVerse(state, start, 'b');
  const dealtB = lostInVerse(state, start, 'a');
  if (dealtA !== dealtB) return dealtA > dealtB ? 'a' : 'b';
  return otherSide(state.opener);
}

function gain(state: BattleState, start: VerseStart, side: Side): number {
  return state.crews[side].hype - start.hype[side];
}

function lostInVerse(state: BattleState, start: VerseStart, side: Side): number {
  return state.crews[side].confidenceLost - start.lost[side];
}

/** Between verses each hype meter drops to `VERSE_HYPE_KEEP` of itself, rounded down. */
function settleCrowd(state: BattleState): void {
  for (const side of ['a', 'b'] as const) {
    const hype = state.crews[side].hype;
    const kept = Math.floor(hype * TUNABLES.VERSE_HYPE_KEEP);
    changeHype(state, side, kept - hype, 'verseBreak');
  }
}

function snapshot(state: BattleState): VerseStart {
  const { a, b } = state.crews;
  return {
    hype: { a: a.hype, b: b.hype },
    lost: { a: a.confidenceLost, b: b.confidenceLost },
  };
}
