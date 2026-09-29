/**
 * Turns a battle's event log into a playback script (§5 Pacing, §11 Battle): one timed beat
 * per event, with the comic words, one-liners and the stage as it stands after the beat. It is
 * pure, so the scene only animates beats, and every peer gets the same script from the same
 * log and seed.
 */

import {
  ABILITIES,
  activeUnits,
  type AbilityId,
  type BattleEvent,
  type BattleLineup,
  type EndReason,
  type Rng,
  type Side,
  type UnitId,
} from '../../core';
import {
  ABILITY_LINES,
  battleTextRng,
  BUFF_WORDS,
  CHOKE_LINES,
  CHOKE_WORDS,
  hitWordsFor,
  HYPE_DROP_LINES,
  HYPE_SWING_LINES,
  pickLine,
  SELF_CHOKE_LINES,
} from '../text';

/** A change of at least this much hype in one turn gets a crowd line (§11). */
export const BIG_HYPE_SWING = 3;

/** Playback aims for 30 to 60 seconds at normal speed (§5 Pacing). */
export const TARGET_MIN_MS = 30_000;
export const TARGET_MAX_MS = 60_000;
/** Short battles are slowed down at most this much to get closer to the target. */
export const MAX_STRETCH = 1.4;

/** Screen time of each beat at normal speed, before the tempo is fitted to the target. */
export const BEAT_MS = {
  intro: 1600,
  turn: 350,
  bar: 1100,
  ability: 850,
  abilityLine: 700,
  diss: 650,
  buff: 550,
  hype: 200,
  choke: 1200,
  chokeLine: 700,
  front: 650,
  swing: 1200,
  end: 2600,
} as const;

export interface PlaybackCrew {
  readonly name: string;
  readonly lineup: BattleLineup;
}

export interface McStats {
  readonly flow: number;
  readonly confidence: number;
}

/** The stage after a beat: who stands where, their stats and both hype meters. */
export interface StageSnapshot {
  /** MCs on stage, front first. */
  readonly stage: Readonly<Record<Side, readonly UnitId[]>>;
  readonly stats: Readonly<Record<UnitId, McStats>>;
  readonly hype: Readonly<Record<Side, number>>;
  readonly turn: number;
}

/** A speech bubble: said by a unit, or by the crowd of one side when `speaker` is `null`. */
export interface Speech {
  readonly speaker: UnitId | null;
  readonly side: Side;
  readonly text: string;
}

export type BeatAction =
  | { readonly kind: 'intro'; readonly opener: Side }
  | { readonly kind: 'turn'; readonly side: Side; readonly turn: number }
  | {
      readonly kind: 'bar';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly targetId: UnitId;
      readonly damage: number;
      readonly word: string;
    }
  | {
      readonly kind: 'ability';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly name: string;
      readonly speech: Speech | null;
    }
  | {
      readonly kind: 'diss';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly targetId: UnitId;
      readonly damage: number;
      readonly word: string;
    }
  | {
      readonly kind: 'buff';
      readonly side: Side;
      readonly targetId: UnitId;
      readonly flow: number;
      readonly confidence: number;
      readonly word: string;
    }
  | { readonly kind: 'hype'; readonly side: Side; readonly change: number }
  | {
      readonly kind: 'choke';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly word: string;
      readonly speech: Speech;
    }
  | { readonly kind: 'front'; readonly side: Side; readonly unitId: UnitId }
  | {
      readonly kind: 'swing';
      readonly side: Side;
      readonly rising: boolean;
      readonly speech: Speech;
    }
  | {
      readonly kind: 'end';
      readonly winner: Side;
      readonly reason: EndReason;
      readonly margin: number;
    };

export interface Beat {
  readonly action: BeatAction;
  /** Milliseconds at normal speed. */
  readonly duration: number;
  readonly after: StageSnapshot;
}

export interface Playback {
  readonly start: StageSnapshot;
  readonly beats: readonly Beat[];
  readonly totalMs: number;
}

interface Stage {
  stage: Record<Side, UnitId[]>;
  stats: Map<UnitId, McStats>;
  hype: Record<Side, number>;
  turn: number;
  /** The opening front MCs, who stand at the mic from the start: their first `front` shows nothing. */
  atMic: Set<UnitId>;
}

/** Everything the builder needs to name units and crews. */
interface Cast {
  readonly names: ReadonlyMap<UnitId, string>;
  readonly crews: Readonly<Record<Side, string>>;
  readonly rng: Rng;
}

interface BeatDraft {
  readonly action: BeatAction;
  readonly duration: number;
}

export function buildPlayback(
  a: PlaybackCrew,
  b: PlaybackCrew,
  events: readonly BattleEvent[],
  seed: number,
): Playback {
  const cast: Cast = {
    names: new Map(
      [...activeUnits(a.lineup), ...activeUnits(b.lineup)].map((unit) => [unit.id, unit.stageName]),
    ),
    crews: { a: a.name, b: b.name },
    rng: battleTextRng(seed),
  };
  const stage = openingStage(a.lineup, b.lineup);
  const start = snapshot(stage);
  const beats: Beat[] = [];
  let turnStartHype = { ...stage.hype };
  const push = (draft: BeatDraft): void => {
    beats.push({ ...draft, after: snapshot(stage) });
  };
  for (const [index, event] of events.entries()) {
    if (event.kind === 'turn' || event.kind === 'end') {
      for (const swing of swings(stage, turnStartHype, cast)) push(swing);
      turnStartHype = { ...stage.hype };
    }
    const draft = beatFor(event, events[index + 1], stage, cast);
    if (draft !== null) push(draft);
  }
  return fitTempo(start, beats);
}

function beatFor(
  event: BattleEvent,
  next: BattleEvent | undefined,
  stage: Stage,
  cast: Cast,
): BeatDraft | null {
  switch (event.kind) {
    case 'start':
      return { action: { kind: 'intro', opener: event.opener }, duration: BEAT_MS.intro };
    case 'turn':
      stage.turn = event.turn;
      return {
        action: { kind: 'turn', side: event.side, turn: event.turn },
        duration: BEAT_MS.turn,
      };
    case 'bar':
      loseConfidence(stage, event.targetId, event.damage);
      return {
        action: { ...event, word: cast.rng.pick(hitWordsFor(event.damage)) },
        duration: BEAT_MS.bar,
      };
    case 'ability':
      return abilityBeat(event.side, event.unitId, event.abilityId, hasEffect(next), cast);
    case 'diss':
      loseConfidence(stage, event.targetId, event.damage);
      return {
        action: {
          kind: 'diss',
          side: event.side,
          unitId: event.unitId,
          targetId: event.targetId,
          damage: event.damage,
          word: cast.rng.pick(hitWordsFor(event.damage)),
        },
        duration: BEAT_MS.diss,
      };
    case 'buff':
      gainStats(stage, event.targetId, event.flow, event.confidence);
      return {
        action: {
          kind: 'buff',
          side: event.side,
          targetId: event.targetId,
          flow: event.flow,
          confidence: event.confidence,
          word: cast.rng.pick(BUFF_WORDS),
        },
        duration: BEAT_MS.buff,
      };
    case 'hype':
      stage.hype[event.side] = event.hype;
      return {
        action: { kind: 'hype', side: event.side, change: event.change },
        duration: BEAT_MS.hype,
      };
    case 'choke':
      return chokeBeat(event.side, event.unitId, stage, cast);
    case 'front':
      if (stage.atMic.delete(event.unitId)) return null;
      return {
        action: { kind: 'front', side: event.side, unitId: event.unitId },
        duration: BEAT_MS.front,
      };
    case 'end':
      return {
        action: { kind: 'end', winner: event.winner, reason: event.reason, margin: event.margin },
        duration: BEAT_MS.end,
      };
  }
}

function abilityBeat(
  side: Side,
  unitId: UnitId,
  abilityId: AbilityId,
  effective: boolean,
  cast: Cast,
): BeatDraft {
  const ability = ABILITIES[abilityId];
  const speech: Speech | null = effective
    ? {
        speaker: unitId,
        side,
        text: pickLine(cast.rng, ABILITY_LINES[ability.effect.kind], {
          speaker: nameOf(cast, unitId),
          ability: ability.name,
          crew: cast.crews[side],
          enemyCrew: cast.crews[other(side)],
        }),
      }
    : null;
  return {
    action: { kind: 'ability', side, unitId, name: ability.name, speech },
    duration: BEAT_MS.ability + (speech === null ? 0 : BEAT_MS.abilityLine),
  };
}

/** The rival front MC taunts the MC that choked, or it says its last words if there is none. */
function chokeBeat(side: Side, unitId: UnitId, stage: Stage, cast: Cast): BeatDraft {
  const rival = stage.stage[other(side)][0];
  const speech: Speech =
    rival === undefined
      ? {
          speaker: unitId,
          side,
          text: pickLine(cast.rng, SELF_CHOKE_LINES, {
            speaker: nameOf(cast, unitId),
            crew: cast.crews[side],
          }),
        }
      : {
          speaker: rival,
          side: other(side),
          text: pickLine(cast.rng, CHOKE_LINES, {
            speaker: nameOf(cast, rival),
            target: nameOf(cast, unitId),
            crew: cast.crews[other(side)],
          }),
        };
  stage.stage[side] = stage.stage[side].filter((id) => id !== unitId);
  stage.atMic.delete(unitId);
  return {
    action: { kind: 'choke', side, unitId, word: cast.rng.pick(CHOKE_WORDS), speech },
    duration: BEAT_MS.choke + BEAT_MS.chokeLine,
  };
}

/** Crowd lines for every crew whose hype moved by `BIG_HYPE_SWING` or more this turn. */
function swings(stage: Stage, turnStart: Readonly<Record<Side, number>>, cast: Cast): BeatDraft[] {
  return (['a', 'b'] as const).flatMap((side) => {
    const change = stage.hype[side] - turnStart[side];
    if (Math.abs(change) < BIG_HYPE_SWING) return [];
    const rising = change > 0;
    const text = pickLine(cast.rng, rising ? HYPE_SWING_LINES : HYPE_DROP_LINES, {
      crew: cast.crews[side],
    });
    return [
      {
        action: { kind: 'swing', side, rising, speech: { speaker: null, side, text } },
        duration: BEAT_MS.swing,
      },
    ];
  });
}

/** Whether an ability's effect shows: it hit, buffed or moved the hype. */
function hasEffect(next: BattleEvent | undefined): boolean {
  if (next === undefined) return false;
  return (
    next.kind === 'diss' ||
    next.kind === 'buff' ||
    (next.kind === 'hype' && next.cause === 'ability')
  );
}

function openingStage(a: BattleLineup, b: BattleLineup): Stage {
  const onStage = (lineup: BattleLineup): UnitId[] =>
    lineup.mcSlots.filter((unit) => unit !== null).map((unit) => unit.id);
  const stats = new Map<UnitId, McStats>();
  for (const unit of [...a.mcSlots, ...b.mcSlots]) {
    if (unit !== null) stats.set(unit.id, { flow: unit.flow, confidence: unit.confidence });
  }
  const stage = { a: onStage(a), b: onStage(b) };
  const fronts = [stage.a[0], stage.b[0]].filter((id) => id !== undefined);
  return { stage, stats, hype: { a: 0, b: 0 }, turn: 0, atMic: new Set(fronts) };
}

function loseConfidence(stage: Stage, id: UnitId, damage: number): void {
  gainStats(stage, id, 0, -damage);
}

function gainStats(stage: Stage, id: UnitId, flow: number, confidence: number): void {
  const stats = stage.stats.get(id);
  if (stats === undefined) return;
  stage.stats.set(id, {
    flow: stats.flow + flow,
    confidence: Math.max(0, stats.confidence + confidence),
  });
}

function snapshot(stage: Stage): StageSnapshot {
  return {
    stage: { a: [...stage.stage.a], b: [...stage.stage.b] },
    stats: Object.fromEntries(stage.stats),
    hype: { ...stage.hype },
    turn: stage.turn,
  };
}

/**
 * Scales every beat so the battle plays in `TARGET_MIN_MS` to `TARGET_MAX_MS`: long battles
 * speed up, short ones slow down by at most `MAX_STRETCH`.
 */
function fitTempo(start: StageSnapshot, beats: readonly Beat[]): Playback {
  const raw = beats.reduce((sum, beat) => sum + beat.duration, 0);
  let tempo = 1;
  if (raw > TARGET_MAX_MS) tempo = TARGET_MAX_MS / raw;
  else if (raw > 0 && raw < TARGET_MIN_MS) tempo = Math.min(TARGET_MIN_MS / raw, MAX_STRETCH);
  const scaled = beats.map((beat) => ({ ...beat, duration: Math.round(beat.duration * tempo) }));
  return { start, beats: scaled, totalMs: scaled.reduce((sum, beat) => sum + beat.duration, 0) };
}

export function other(side: Side): Side {
  return side === 'a' ? 'b' : 'a';
}

function nameOf(cast: Cast, id: UnitId): string {
  return cast.names.get(id) ?? id;
}
