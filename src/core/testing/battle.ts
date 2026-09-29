/** Helpers for battle tests. Only test files import this module. */

import { simulateBattle } from '../battle';
import type { BattleEvent, BattleEventKind, Side } from '../model';
import { crew } from './fixtures';

const seeds = new Map<Side, number>();

/** A seed whose coin flip lets `side` open, so tests can fix the turn order. */
export function seedWhereOpens(side: Side): number {
  const known = seeds.get(side);
  if (known !== undefined) return known;
  const empty = crew({});
  for (let seed = 0; ; seed++) {
    const [start] = simulateBattle(empty, empty, seed);
    if (start?.kind === 'start' && start.opener === side) {
      seeds.set(side, seed);
      return seed;
    }
  }
}

/** The events of the given kinds, in order. */
export function eventsOf<K extends BattleEventKind>(
  events: readonly BattleEvent[],
  ...kinds: K[]
): Extract<BattleEvent, { kind: K }>[] {
  return events.filter((event): event is Extract<BattleEvent, { kind: K }> =>
    (kinds as BattleEventKind[]).includes(event.kind),
  );
}

/** Compact one-line descriptions of a log, for readable order assertions. */
export function describeEvents(events: readonly BattleEvent[]): string[] {
  return events.map((event) => {
    switch (event.kind) {
      case 'start':
        return `start ${event.opener}`;
      case 'turn':
        return `turn ${String(event.turn)} ${event.side}`;
      case 'front':
        return `front ${event.unitId}`;
      case 'bar':
        return `bar ${event.unitId}>${event.targetId} ${String(event.damage)}`;
      case 'ability':
        return `ability ${event.unitId} ${event.abilityId}`;
      case 'diss':
        return `diss ${event.unitId}>${event.targetId} ${String(event.damage)}`;
      case 'buff':
        return `buff ${event.targetId} +${String(event.flow)}/+${String(event.confidence)}`;
      case 'hype':
        return `hype ${event.side} ${event.change > 0 ? '+' : ''}${String(event.change)}=${String(event.hype)}`;
      case 'choke':
        return `choke ${event.unitId}`;
      case 'end':
        return `end ${event.winner} ${event.reason} ${String(event.margin)}`;
    }
  });
}
