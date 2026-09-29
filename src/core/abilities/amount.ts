import type { Amount, Power } from '../model';

/**
 * An effect's number: the value for the ability's power, plus `⌊H / hypeDivisor⌋` of the
 * crew's current hype for crowd abilities (§9 Values). Outside a battle `hype` is 0.
 */
export function evaluateAmount(amount: Amount, power: Power, hype: number): number {
  const [power1, power2, power3] = amount.byPower;
  const base = power === 1 ? power1 : power === 2 ? power2 : power3;
  const crowd = amount.hypeDivisor === undefined ? 0 : Math.floor(hype / amount.hypeDivisor);
  return base + crowd;
}
