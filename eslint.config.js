// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Builds a `no-restricted-imports` pattern that blocks relative imports of sibling layers.
 * Layers depend only inward: app → render/net → core (CLAUDE.md, D-005).
 * @param {readonly string[]} layers
 * @param {string} message
 */
function forbidLayers(layers, message) {
  return { regex: `^(\\.\\./)+(${layers.join('|')})(/|$)`, message };
}

/** Browser and runtime globals `core/` must not touch: it is pure and deterministic. */
const CORE_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'performance',
  'crypto',
  'Date',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
].map((name) => ({
  name,
  message: `core/ is pure and deterministic: no ${name}. Pass data or the seeded RNG in instead.`,
}));

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'test-results/', 'playwright-report/'] },

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', 'ts-expect-error': 'allow-with-description' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Node-side config files. Plain JS files are not in tsconfig, so they skip typed rules.
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // core/: pure rules. No engine, network, DOM, ambient randomness or time.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: 'core/ must not import Phaser (D-005).' },
            { name: 'peerjs', message: 'core/ must not import PeerJS (D-005).' },
          ],
          patterns: [
            { group: ['phaser/*', 'peerjs/*'], message: 'core/ must not import Phaser or PeerJS.' },
            forbidLayers(['net', 'render', 'app'], 'core/ depends on nothing else in the project.'),
          ],
        },
      ],
      'no-restricted-globals': ['error', ...CORE_FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG that is passed in.',
        },
        { object: 'globalThis', message: 'core/ must not reach for runtime globals.' },
      ],
    },
  },

  // net/: may use core/ only; never the renderer or app wiring.
  {
    files: ['src/net/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'net/ must not import Phaser.' }],
          patterns: [forbidLayers(['render', 'app'], 'net/ may only depend on core/.')],
        },
      ],
    },
  },

  // render/: may use core/ only; never the network or app wiring.
  {
    files: ['src/render/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'peerjs', message: 'render/ must not import PeerJS.' }],
          patterns: [forbidLayers(['net', 'app'], 'render/ may only depend on core/.')],
        },
      ],
    },
  },

  prettier,
);
