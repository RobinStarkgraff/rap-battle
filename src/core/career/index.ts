/** A crew's rounds and seasons (§3, §6, §7): upkeep, battle results and the season end. */

export { applyBattleResult } from './battleResult';
export type { BattleResultOutcome } from './battleResult';
export { ageUnits, recordSeason, renegotiateSalaries, retireUnits } from './seasonEnd';
export type { Aged, Retired, Retirement, SalaryChange, SeasonCrews } from './seasonEnd';
export { upkeep } from './upkeep';
export type { UpkeepOutcome } from './upkeep';
