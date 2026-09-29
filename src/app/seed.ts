/**
 * New leagues get a random seed; `?seed=<n>` in the page address fixes it, so a league can be
 * replayed exactly (browser tests, bug reports).
 */
export function seedSource(search: string, random: () => number = Math.random): () => number {
  const fixed = Number(new URLSearchParams(search).get('seed') ?? Number.NaN);
  return Number.isInteger(fixed) ? () => fixed : () => Math.floor(random() * 0x1_0000_0000);
}
