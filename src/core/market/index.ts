/** The player market (§4): unit generation, the public list, value and scouting. */

export { EMPTY_UNIT_RECORD, generateUnit, rollAge, rollStageName } from './generate';
export {
  addFreeAgent,
  addRookies,
  createMarket,
  findFreeAgent,
  publicUnitId,
  removeFromMarket,
} from './market';
export type { Market, RookiesEntered } from './market';
export { NO_SCOUTING, scout, scoutedUnitId } from './scouting';
export type { ScoutContext, Scouted, Scouting } from './scouting';
export {
  askPrice,
  benchSalary,
  onFarewellTour,
  rating,
  retireAge,
  salaryFor,
  seasonsLeft,
  youthPremium,
} from './value';
