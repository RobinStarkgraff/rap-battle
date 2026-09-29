/** The AI manager that runs bots and absent players' crews (§7, D-030). */

export { AI_MANAGER, MAX_SCOUTS, OVERBID_CHANCE, UPGRADE_MARGIN, VALUE_JITTER } from './manager';
export { movesFor, planLineup, surplus } from './lineup';
export type { LineupPlan } from './lineup';
export { payrollWith, SLOT_ABILITY_BONUS, slotFit, strength, valueForMoney } from './value';
