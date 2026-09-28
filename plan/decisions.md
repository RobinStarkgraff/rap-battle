# Decisions

Newest at the bottom. Format: ID, date, decision, reason. Replaced decisions stay here
and are marked "superseded by D-###".

- **D-001 (2026-09-28): Runs in the browser, written in TypeScript (strict), built with Vite.**
  Static hosting (itch.io or Pages), instant reloads, and WebRTC is built in. Strict types
  are the main safety net for AI-written code.
- **D-002 (2026-09-28): Phaser 3 for rendering.** Scenes, tweens, input and `Graphics`
  shape drawing come built in, and AI models know it well. PixiJS was the leaner
  alternative, but it would mean building tweens and scene management ourselves.
- **D-003 (2026-09-28): P2P through PeerJS (WebRTC data channels).** Players connect with
  a room code and there is no game server. Godot and Unity were rejected because they are
  editor-centric and harder for an AI to write and verify.
- **D-004 (2026-09-28): Deterministic lockstep at phase boundaries.** Peers only exchange
  lineups, seeds and lock-ins. Both run the same pure `simulateMatch()`, and a result hash
  detects desyncs. No real-time sync, so latency doesn't matter.
- **D-005 (2026-09-28): Strict layering, with `core/` pure (no Phaser, DOM, network or
  ambient randomness).** This lets the rules be tested thoroughly without a screen and
  keeps the AI-written code from getting tangled. A lint rule enforces it.
- **D-006 (2026-09-28): Vitest + Playwright + ESLint + Prettier, combined in `make check`.**
  This gives the AI one objective pass/fail command to run after every change.
- **D-007 (2026-09-28): The game is a rap battle crew manager, not a sports manager (Q-003).**
  Players manage a crew of rappers and support members and battle other crews; Super Auto
  Pets still drives the shop and battle loop. Naming in code follows the theme: `UnitDef`,
  `Crew`, `simulateBattle(crewA, crewB, seed) → BattleEvent[]` (was `simulateMatch`/`MatchEvent`).
- **D-008 (2026-09-28): Desktop browser only (Q-002).** Mouse input, fixed landscape layout.
  Touch support is out of scope.
- **D-009 (2026-09-28): Crew = 3 MC slots + 2 support slots + a small bench (Q-005, Q-007).**
  MCs battle; support units (DJ, hype man, producer…) never take hits but buff or trigger.
  The bench holds units that are resting. The bench size is tunable.
- **D-010 (2026-09-28): First battle style is "front MCs clash" (Q-004).** The front MCs
  trade bars that deal hype damage to confidence; an MC at 0 confidence leaves the stage;
  the last crew with an MC standing wins. `simulateBattle` goes through a `BattleStyle`
  interface (style ID → pure resolver) so other styles can be added later without
  special cases.
- **D-011 (2026-09-28): Meta layer = stage positions + stamina / voice fatigue (Q-005).**
  Abilities can care about slot position (e.g. opener, closer). Performing costs stamina,
  which carries over between battles and recovers on the bench.
- **D-012 (2026-09-28): Persistent crews with salary, age and retirement (Q-005, Q-006).**
  The crew carries over between battles and sessions and is saved in the player's browser
  (localStorage). Every unit costs a salary each round and ages; old units retire. This is
  what limits power creep, since the game has no end.
- **D-013 (2026-09-28): Session league among friends with divisions and promotion (Q-006).**
  One peer hosts the league (star topology over PeerJS, still no game server, so D-003
  holds). The host keeps standings, makes 1v1 pairings each round and runs promotion and
  relegation. Each battle still uses deterministic lockstep (D-004). The league's rules
  (standings, pairing, promotion) are pure `core/` functions.
- **D-014 (2026-09-28): Pinned toolchain versions: TypeScript ~5.9, Vite 8, Phaser 3.90.**
  TypeScript 7 (the native port) is the newest release, but typescript-eslint only
  supports `<6.1`, and T-003 needs it, so we stay on 5.9. Phaser 4 is out, but D-002 chose
  Phaser 3 because AI models know it well, so we pin `^3.90`. Vite 8 needs Node ≥ 20.19,
  which the container has (20.20). The tsconfig adds strict extras
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, unused checks).
- **D-015 (2026-09-28): `node_modules` in the dev container is its own Docker volume.**
  The workspace is bind-mounted from a macOS host, and Vite 8's bundler (rolldown) ships
  per-platform native bindings, so one shared `node_modules` breaks either the host or the
  container. `.devcontainer/project/devcontainer-overrides.json` mounts
  `rap-battle-node-modules-${devcontainerId}` at `/workspace/node_modules`; the project
  `post-create.sh` chowns it and runs `npm ci`. The host keeps its own install in the real folder.
- **D-016 (2026-09-28): Lint and format setup: ESLint 10 flat config + typescript-eslint
  `strictTypeChecked` and `stylisticTypeChecked`, Prettier 3 (single quotes, width 100,
  trailing commas), `eslint-config-prettier` so they never disagree.** Layer boundaries
  use ESLint's built-in `no-restricted-imports` / `no-restricted-globals` /
  `no-restricted-properties` per folder, not `eslint-plugin-boundaries` or
  `eslint-plugin-import`: no extra plugin to keep compatible with ESLint 10, and the
  messages can name the rule they enforce. `core/` may not import Phaser, PeerJS or the
  other layers, and may not use `Math.random`, `Date`, timers, `globalThis` or DOM/browser
  globals. `net/` and `render/` may not import each other or `app/`. Plain `.js` files
  (only `eslint.config.js`) skip typed rules because they are not in the tsconfig.
