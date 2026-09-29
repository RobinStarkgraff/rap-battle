/** Upkeep (§3 step 1): income, `upkeep` abilities, then the wallet cap. */

import { applyUpkeepAbilities, type CrewOutcome } from '../abilities';
import type { Crew } from '../model';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';

export interface UpkeepOutcome extends CrewOutcome {
  /** `BASE_INCOME`, plus `WIN_BONUS` after a win. */
  readonly income: number;
  /** Gold lost to the wallet cap. */
  readonly lostToCap: number;
}

/**
 * One crew's upkeep: `BASE_INCOME` plus `WIN_BONUS` if it won its last battle, then its
 * `upkeep` abilities (gold, xp, permanent buffs), then the wallet is capped at `WALLET_CAP`.
 * Rookies enter the market once per round for the whole league, not here.
 */
export function upkeep(crew: Crew, wonLastBattle: boolean, rng: Rng): UpkeepOutcome {
  const income = TUNABLES.BASE_INCOME + (wonLastBattle ? TUNABLES.WIN_BONUS : 0);
  const paid = { ...crew, wallet: crew.wallet + income };
  const { crew: after, events } = applyUpkeepAbilities(paid, rng);
  const wallet = Math.min(after.wallet, TUNABLES.WALLET_CAP);
  return {
    crew: { ...after, wallet },
    events,
    income,
    lostToCap: after.wallet - wallet,
  };
}
