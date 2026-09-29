/**
 * The market tab's table (§11 Screens: the scouting table): rows for the scouted units and the
 * public list, filtered by role and archetype, sorted by any column, and the player's draft
 * bids checked against the core bid rules. Pure, so it is unit-tested.
 */

import {
  ABILITIES,
  ARCHETYPES,
  askPrice,
  bidsProblem,
  onFarewellTour,
  salaryFor,
  seasonsLeft,
  type AbilityDef,
  type ArchetypeId,
  type Bid,
  type BidError,
  type LearnedAbility,
  type Role,
  type Unit,
  type UnitId,
} from '../../core';
import type { HubState } from './types';
import { playerShop } from './view';

export const SORT_KEYS = ['name', 'type', 'stats', 'abilities', 'age', 'ask', 'salary'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type RoleFilter = Role | 'all';

/** The market tab's own view state, kept by the hub scene across redraws. */
export interface MarketUi {
  sort: { key: SortKey; descending: boolean };
  role: RoleFilter;
  archetype: ArchetypeId | null;
  page: number;
  selected: UnitId | null;
  /** Bids the player is putting together for the open bidding round, by unit. */
  draft: Map<UnitId, number>;
  /** The bid input for the selected unit. */
  amount: number;
}

export function createMarketUi(): MarketUi {
  return {
    sort: { key: 'ask', descending: true },
    role: 'all',
    archetype: null,
    page: 0,
    selected: null,
    draft: new Map(),
    amount: 0,
  };
}

export interface MarketRow {
  readonly unit: Unit;
  readonly scouted: boolean;
  readonly ask: number;
  readonly salary: number;
  readonly seasonsLeft: number;
  readonly farewell: boolean;
  /** The draft bid on this unit, if any. */
  readonly bid: number | null;
}

export interface MarketTable {
  readonly scouted: readonly MarketRow[];
  readonly publicList: readonly MarketRow[];
}

export function marketTable(state: HubState, ui: MarketUi): MarketTable {
  const shop = playerShop(state);
  const row = (unit: Unit, scouted: boolean): MarketRow => ({
    unit,
    scouted,
    ask: askPrice(unit),
    salary: salaryFor(unit),
    seasonsLeft: seasonsLeft(unit),
    farewell: onFarewellTour(unit),
    bid: ui.draft.get(unit.id) ?? null,
  });
  const shown = (candidate: MarketRow): boolean =>
    (ui.role === 'all' || candidate.unit.role === ui.role) &&
    (ui.archetype === null || candidate.unit.archetype === ui.archetype);
  const sorted = (rows: MarketRow[]): MarketRow[] =>
    sortRows(rows.filter(shown), ui.sort.key, ui.sort.descending);
  return {
    scouted: sorted(shop.scouting.units.map((unit) => row(unit, true))),
    publicList: sorted(state.round.market.publicList.map((unit) => row(unit, false))),
  };
}

/** Sorts rows by a column; ties keep the market's order (newest free agents last). */
export function sortRows(
  rows: readonly MarketRow[],
  key: SortKey,
  descending: boolean,
): MarketRow[] {
  const value = SORT_VALUES[key];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      const a = value(x.row);
      const b = value(y.row);
      const order =
        typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
      return (descending ? -order : order) || x.index - y.index;
    })
    .map(({ row }) => row);
}

const SORT_VALUES: Readonly<Record<SortKey, (row: MarketRow) => number | string>> = {
  name: (row) => row.unit.stageName,
  type: (row) => ARCHETYPES[row.unit.archetype].name,
  stats: (row) => statsValue(row.unit),
  abilities: (row) => row.unit.abilities.map((learned) => ABILITIES[learned.id].name).join(', '),
  age: (row) => row.unit.age,
  ask: (row) => row.ask,
  salary: (row) => row.salary,
};

/** An MC's flow plus confidence; a support unit's total ability power. */
export function statsValue(unit: Unit): number {
  return unit.role === 'mc'
    ? unit.flow + unit.confidence
    : unit.abilities.reduce((sum, learned) => sum + learned.power, 0);
}

export function statsText(unit: Unit): string {
  return unit.role === 'mc'
    ? `${String(unit.flow)} / ${String(unit.confidence)}`
    : unit.abilities.map((learned) => `P${String(learned.power)}`).join(' ');
}

/** The draft as bids, dropping units that left the public list (signed by someone). */
export function draftBids(state: HubState, ui: MarketUi): Bid[] {
  const listed = new Set(state.round.market.publicList.map((unit) => unit.id));
  return [...ui.draft]
    .filter(([unitId]) => listed.has(unitId))
    .map(([unitId, amount]) => ({ unitId, amount }));
}

/** Why the draft plus a changed bid can't be placed, or `null` if it can. */
export function draftProblem(state: HubState, ui: MarketUi, change?: Bid): BidError | null {
  const bids = draftBids(state, ui).filter((bid) => bid.unitId !== change?.unitId);
  return bidsProblem(
    playerShop(state).crew,
    change === undefined ? bids : [...bids, change],
    state.round.market,
  );
}

/** What the ability does at a power, with its numbers: "Diss the enemy front MC (2)". */
export function abilityText(learned: LearnedAbility): string {
  const def = ABILITIES[learned.id];
  return `${def.text} (${valueText(def, learned.power)})`;
}

function valueText(def: AbilityDef, power: LearnedAbility['power']): string {
  const { effect } = def;
  const amount = (value: { byPower: readonly number[]; hypeDivisor?: number }): string => {
    const base = value.byPower[power - 1] ?? 0;
    if (value.hypeDivisor === undefined) return String(base);
    const crowd = `hype ÷ ${String(value.hypeDivisor)}`;
    return base === 0 ? crowd : `${crowd} + ${String(base)}`;
  };
  switch (effect.kind) {
    case 'buff': {
      const parts = [
        effect.flow === undefined ? null : `+${amount(effect.flow)} flow`,
        effect.confidence === undefined ? null : `+${amount(effect.confidence)} confidence`,
      ].filter((part) => part !== null);
      return parts.join(', ');
    }
    case 'diss':
      return `${amount(effect.amount)} damage`;
    case 'hype':
      return `${amount(effect.amount)} hype`;
    case 'gold':
      return `${amount(effect.amount)} gold`;
    case 'xp':
      return `${amount(effect.amount)} xp`;
  }
}
