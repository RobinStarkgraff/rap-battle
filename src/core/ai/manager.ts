/**
 * The AI manager (§7 AI managers, D-030): one simple greedy policy that runs bots and absent
 * players' crews under the same rules as a human. It bids the ask on the best-value units
 * it can afford for its empty slots, makes one upgrade bid for a clearly better unit, scouts
 * when a slot is still empty after the bidding, plays its strongest units in the order that
 * suits them, releases bench units weaker than its whole lineup, and releases its worst value
 * for salary when the payroll outgrows its income. Its random choices come
 * from seeds derived from the league, so every peer gets the same decisions.
 */

import { askPrice, salaryFor } from '../market';
import { allUnits, type Crew, type CrewId, type Role, type Unit } from '../model';
import { createRng, deriveSeed, type Rng } from '../rng';
import {
  roundBid,
  roundMove,
  roundRelease,
  roundScout,
  roundSignScouted,
  shopOf,
  type CrewManager,
  type RoundState,
} from '../round';
import { bidsProblem, payroll, type Bid } from '../shop';
import { TUNABLES } from '../tunables';
import { movesFor, planLineup, surplus } from './lineup';
import { payrollWith, strength, valueForMoney } from './value';

/** How much stronger than the weakest active unit of its role an upgrade must be. */
export const UPGRADE_MARGIN = 3;
/** The chance to bid one gold over the ask, so bots don't tie on every unit. */
export const OVERBID_CHANCE = 0.3;
/** How much the seeded jitter moves a unit's value up or down, so bots differ in taste. */
export const VALUE_JITTER = 0.1;
/** The most scoutings per round, so a crew doesn't scout its wallet away. */
export const MAX_SCOUTS = 2;

export const AI_MANAGER: CrewManager = {
  bid: (state, crewId) => {
    const trimmed =
      state.bidding.round === 1 ? trimPayroll(state, crewId, TUNABLES.BASE_INCOME) : state;
    const shop = shopOf(trimmed, crewId);
    if (!shop.ok) return trimmed;
    const rng = aiRng(trimmed, crewId, 'bid', trimmed.bidding.round);
    const placed = roundBid(trimmed, crewId, chooseBids(shop.value.crew, trimmed, rng));
    return placed.ok ? placed.value : trimmed;
  },
  lineup: (state, crewId) => {
    const scouted = scoutForEmptySlots(state, crewId);
    const arranged = releaseSurplus(arrange(scouted, crewId), crewId);
    const shop = shopOf(arranged, crewId);
    return shop.ok ? trimPayroll(arranged, crewId, shop.value.crew.wallet) : arranged;
  },
};

/**
 * Releases units until the payroll is at most `limit`: bench units first, then the unit with
 * the least strength per gold of salary. Before the bidding the limit is `BASE_INCOME`, so the
 * crew can keep paying; before lock-in it is the wallet, so the crew picks what goes rather
 * than the forced lock-in, which releases the cheapest units first.
 */
function trimPayroll(state: RoundState, crewId: CrewId, limit: number): RoundState {
  let current = state;
  for (;;) {
    const shop = shopOf(current, crewId);
    if (!shop.ok) return current;
    const { crew } = shop.value;
    if (payroll(crew) <= limit) return current;
    const worst = worstValueForSalary(crew);
    if (worst === undefined) return current;
    const released = roundRelease(current, crewId, worst.id);
    if (!released.ok) return current;
    current = released.value;
  }
}

/** The unit to release first, never the crew's last MC: a crew without one loses at once. */
function worstValueForSalary(crew: Crew): Unit | undefined {
  const mcs = allUnits(crew).filter((unit) => unit.role === 'mc');
  const paid = allUnits(crew).filter(
    (unit) => unit.salary > 0 && !(unit.role === 'mc' && mcs.length === 1),
  );
  const onBench = paid.filter((unit) => crew.bench.includes(unit));
  const candidates = onBench.length > 0 ? onBench : paid;
  return [...candidates].sort((x, y) => strength(x) / x.salary - strength(y) / y.salary)[0];
}

function aiRng(state: RoundState, crewId: CrewId, phase: string, step: number): Rng {
  return createRng(deriveSeed(state.league.seed, 'ai', state.round, crewId, phase, step));
}

/**
 * Units that fill an empty active slot, MCs before supports and best value first, then one
 * upgrade onto the bench, each bid at the ask (sometimes one more), as long as the bids stay
 * valid together and the payroll stays within `BASE_INCOME`, so the crew can pay it again.
 */
function chooseBids(crew: Crew, state: RoundState, rng: Rng): Bid[] {
  const jitter = new Map(
    state.market.publicList.map((unit) => [unit.id, 1 + (rng.next() * 2 - 1) * VALUE_JITTER]),
  );
  const score = (unit: Unit): number => valueForMoney(unit) * (jitter.get(unit.id) ?? 1);
  // MCs first: a crew without an MC on stage loses at once, and stats decide battles (§8).
  const byRole = (unit: Unit): number => (unit.role === 'mc' ? 0 : 1);
  const ranked = [...state.market.publicList].sort(
    (x, y) => byRole(x) - byRole(y) || score(y) - score(x),
  );
  const open = { mc: emptySlots(crew, 'mc'), support: emptySlots(crew, 'support') };
  const bids: Bid[] = [];
  const bidOn: Unit[] = [];
  let upgraded = false;
  for (const unit of ranked) {
    const fillsSlot = open[unit.role] > 0;
    const isUpgrade = !fillsSlot && !upgraded && isClearUpgrade(crew, unit);
    if (!fillsSlot && !isUpgrade) continue;
    const bid = affordableBid(crew, bids, bidOn, unit, state, rng);
    if (bid === null) continue;
    bids.push(bid);
    bidOn.push(unit);
    if (fillsSlot) open[unit.role]--;
    else upgraded = true;
  }
  return bids;
}

function affordableBid(
  crew: Crew,
  bids: readonly Bid[],
  bidOn: readonly Unit[],
  unit: Unit,
  state: RoundState,
  rng: Rng,
): Bid | null {
  const signed = [...bidOn, unit].map((candidate) => ({
    ...candidate,
    salary: salaryFor(candidate),
  }));
  const due = payrollWith(crew, signed);
  if (due === null || due > TUNABLES.BASE_INCOME) return null;
  const ask = askPrice(unit);
  const amounts = rng.chance(OVERBID_CHANCE) ? [ask + 1, ask] : [ask];
  for (const amount of amounts) {
    const bid = { unitId: unit.id, amount };
    if (bidsProblem(crew, [...bids, bid], state.market) === null) return bid;
  }
  return null;
}

function emptySlots(crew: Crew, role: Role): number {
  const slots = role === 'mc' ? crew.mcSlots : crew.supportSlots;
  return slots.filter((unit) => unit === null).length;
}

function isClearUpgrade(crew: Crew, unit: Unit): boolean {
  const active = (unit.role === 'mc' ? crew.mcSlots : crew.supportSlots).filter(
    (member) => member !== null,
  );
  if (active.length === 0) return false;
  return strength(unit) >= Math.min(...active.map(strength)) + UPGRADE_MARGIN;
}

/**
 * Scouts while an active slot is still empty, up to `MAX_SCOUTS` times, and signs a scouted
 * unit that fills it if the payroll stays within `BASE_INCOME` and can be paid now.
 */
function scoutForEmptySlots(state: RoundState, crewId: CrewId): RoundState {
  let current = state;
  for (let scouting = 0; scouting < MAX_SCOUTS; scouting++) {
    const shop = shopOf(current, crewId);
    if (!shop.ok) return current;
    const { crew } = shop.value;
    if (emptySlots(crew, 'mc') + emptySlots(crew, 'support') === 0) return current;
    if (crew.wallet < TUNABLES.SCOUT_COST + 1) return current;
    const scouted = roundScout(current, crewId);
    if (!scouted.ok) return current;
    current = signScoutedFits(scouted.value, crewId);
  }
  return current;
}

function signScoutedFits(state: RoundState, crewId: CrewId): RoundState {
  let current = state;
  const shop = shopOf(state, crewId);
  if (!shop.ok) return state;
  const ranked = [...shop.value.scouting.units].sort(
    (x, y) =>
      (x.role === 'mc' ? 0 : 1) - (y.role === 'mc' ? 0 : 1) || valueForMoney(y) - valueForMoney(x),
  );
  for (const unit of ranked) {
    const now = shopOf(current, crewId);
    if (!now.ok) return current;
    const { crew } = now.value;
    if (emptySlots(crew, unit.role) === 0) continue;
    const due = payrollWith(crew, [{ ...unit, salary: salaryFor(unit) }]);
    if (due === null || due > TUNABLES.BASE_INCOME || crew.wallet - askPrice(unit) < due) continue;
    const signed = roundSignScouted(current, crewId, unit.id);
    if (signed.ok) current = signed.value.state;
  }
  return current;
}

/** Moves the strongest units into the active slots, the MCs in their best order. */
function arrange(state: RoundState, crewId: CrewId): RoundState {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return state;
  let current = state;
  for (const { unitId, to } of movesFor(planLineup(allUnits(shop.value.crew)))) {
    const moved = roundMove(current, crewId, unitId, to);
    if (moved.ok) current = moved.value;
  }
  return current;
}

function releaseSurplus(state: RoundState, crewId: CrewId): RoundState {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return state;
  let current = state;
  for (const unit of surplus(shop.value.crew)) {
    const released = roundRelease(current, crewId, unit.id);
    if (released.ok) current = released.value;
  }
  return current;
}
