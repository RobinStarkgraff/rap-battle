/**
 * Regression tests for the layer rules in `eslint.config.js` (D-005, D-016).
 * Each case lints a small snippet as if it lived at `filePath` and checks which boundary
 * rules fire. Type-aware rules are switched off: the snippets are not real files, and the
 * boundary rules don't need type information.
 */
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const BOUNDARY_RULES = new Set([
  'no-restricted-imports',
  'no-restricted-globals',
  'no-restricted-properties',
]);

const eslint = new ESLint({
  cwd: new URL('..', import.meta.url).pathname,
  overrideConfig: [{ files: ['**/*.ts'], ...tseslint.configs.disableTypeChecked }],
});

/** Lints `code` as the file at `filePath` and returns the boundary rules that fired. */
async function boundaryViolations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${filePath}`);
  }
  const fatal = result.messages.find((message) => message.fatal === true);
  if (fatal !== undefined) {
    throw new Error(`Could not parse the snippet for ${filePath}: ${fatal.message}`);
  }
  return result.messages
    .map((message) => message.ruleId)
    .filter((ruleId): ruleId is string => ruleId !== null && BOUNDARY_RULES.has(ruleId));
}

interface Case {
  readonly name: string;
  readonly filePath: string;
  readonly code: string;
  readonly rule: string;
}

const FORBIDDEN: readonly Case[] = [
  // core/ imports nothing outside itself.
  {
    name: 'core imports Phaser',
    filePath: 'src/core/probe.ts',
    code: "import Phaser from 'phaser';\nexport { Phaser };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'core imports a Phaser sub-path',
    filePath: 'src/core/probe.ts',
    code: "import { Scene } from 'phaser/src/scene';\nexport { Scene };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'core imports PeerJS',
    filePath: 'src/core/probe.ts',
    code: "import Peer from 'peerjs';\nexport { Peer };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'core imports render/',
    filePath: 'src/core/probe.ts',
    code: "import { BootScene } from '../render';\nexport { BootScene };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'core imports net/ from a nested folder',
    filePath: 'src/core/battle/probe.ts',
    code: "import { x } from '../../net/peer';\nexport { x };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'core imports app/',
    filePath: 'src/core/probe.ts',
    code: "import { x } from '../app/main';\nexport { x };",
    rule: 'no-restricted-imports',
  },
  // core/ is deterministic: no ambient randomness, time or runtime globals.
  {
    name: 'core uses Math.random',
    filePath: 'src/core/probe.ts',
    code: 'export const roll = Math.random();',
    rule: 'no-restricted-properties',
  },
  {
    name: 'core uses Date.now',
    filePath: 'src/core/probe.ts',
    code: 'export const now = Date.now();',
    rule: 'no-restricted-globals',
  },
  {
    name: 'core constructs a Date',
    filePath: 'src/core/probe.ts',
    code: 'export const today = new Date();',
    rule: 'no-restricted-globals',
  },
  {
    name: 'core uses document',
    filePath: 'src/core/probe.ts',
    code: 'export const body = document.body;',
    rule: 'no-restricted-globals',
  },
  {
    name: 'core uses window',
    filePath: 'src/core/probe.ts',
    code: 'export const width = window.innerWidth;',
    rule: 'no-restricted-globals',
  },
  {
    name: 'core uses localStorage',
    filePath: 'src/core/probe.ts',
    code: "export const save = localStorage.getItem('crew');",
    rule: 'no-restricted-globals',
  },
  {
    name: 'core uses setTimeout',
    filePath: 'src/core/probe.ts',
    code: 'export const timer = setTimeout(() => undefined, 10);',
    rule: 'no-restricted-globals',
  },
  {
    name: 'core reaches through globalThis',
    filePath: 'src/core/probe.ts',
    code: 'export const g = globalThis.navigator;',
    rule: 'no-restricted-properties',
  },
  // net/ and render/ depend only on core/.
  {
    name: 'net imports render/',
    filePath: 'src/net/probe.ts',
    code: "import { BootScene } from '../render';\nexport { BootScene };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'net imports app/',
    filePath: 'src/net/probe.ts',
    code: "import { x } from '../app/main';\nexport { x };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'net imports Phaser',
    filePath: 'src/net/probe.ts',
    code: "import Phaser from 'phaser';\nexport { Phaser };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'render imports net/',
    filePath: 'src/render/probe.ts',
    code: "import { x } from '../net';\nexport { x };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'render imports app/',
    filePath: 'src/render/probe.ts',
    code: "import { x } from '../app/main';\nexport { x };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'render imports PeerJS',
    filePath: 'src/render/probe.ts',
    code: "import Peer from 'peerjs';\nexport { Peer };",
    rule: 'no-restricted-imports',
  },
];

const ALLOWED: readonly Omit<Case, 'rule'>[] = [
  {
    name: 'core imports a sibling core module',
    filePath: 'src/core/probe.ts',
    code: "import { clamp } from './math';\nexport const x = clamp(1, 0, 2);",
  },
  {
    name: 'core uses Math.min',
    filePath: 'src/core/probe.ts',
    code: 'export const low = Math.min(1, 2);',
  },
  {
    name: 'net imports core/',
    filePath: 'src/net/probe.ts',
    code: "import { clamp } from '../core';\nexport { clamp };",
  },
  {
    name: 'render imports core/ and Phaser',
    filePath: 'src/render/probe.ts',
    code: "import Phaser from 'phaser';\nimport { clamp } from '../core';\nexport { Phaser, clamp };",
  },
  {
    name: 'app imports every layer',
    filePath: 'src/app/probe.ts',
    code: [
      "import Phaser from 'phaser';",
      "import { clamp } from '../core';",
      "import { x } from '../net';",
      "import { BootScene } from '../render';",
      'export const now = Date.now();',
      'export { Phaser, clamp, x, BootScene };',
    ].join('\n'),
  },
];

describe('layer boundary lint rules', () => {
  it.each(FORBIDDEN)('reports $rule when $name', async ({ filePath, code, rule }) => {
    expect(await boundaryViolations(filePath, code)).toEqual([rule]);
  });

  it.each(ALLOWED)('allows it when $name', async ({ filePath, code }) => {
    expect(await boundaryViolations(filePath, code)).toEqual([]);
  });
});
