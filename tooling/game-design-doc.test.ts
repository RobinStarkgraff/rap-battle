/**
 * Checks that `core/` matches `docs/game-design.md` where the doc is a table of data:
 * CLAUDE.md says a rule change updates both in the same change, and this catches drift.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TUNABLES } from '../src/core/tunables';

const doc = readFileSync(new URL('../docs/game-design.md', import.meta.url), 'utf8');

/** The rows of the §10 Tunables table as `[names, defaults]` cells. */
function tunableRows(): [string, string][] {
  const section = doc.slice(doc.indexOf('## 10. Tunables'), doc.indexOf('## 11.'));
  return section
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => {
      const [, names = '', defaults = ''] = line.split('|').map((cell) => cell.trim());
      return [names, defaults];
    });
}

/** `"`A` / `B`"` and `"1 / 2 (note)"` → `["A", "B"]` and `[1, 2]`. */
function parseRow([names, defaults]: [string, string]): [string, number][] {
  const keys = names.split('/').map((name) => name.trim().replaceAll('`', ''));
  const values = defaults
    .replace(/\(.*\)/, '')
    .split('/')
    .map((value) => Number(value.trim()));
  expect(values, names).toHaveLength(keys.length);
  return keys.map((key, index) => [key, values[index] ?? Number.NaN]);
}

describe('docs/game-design.md §10 Tunables', () => {
  const documented = new Map(tunableRows().flatMap(parseRow));

  it('lists exactly the tunables of core/tunables.ts', () => {
    expect([...documented.keys()].sort()).toEqual(Object.keys(TUNABLES).sort());
  });

  it('has the same default for each of them', () => {
    for (const [name, value] of Object.entries(TUNABLES)) {
      expect(documented.get(name), name).toBe(value);
    }
  });
});
