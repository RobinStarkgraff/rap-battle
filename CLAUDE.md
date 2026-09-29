# CLAUDE.md

Guidance for Claude Code (and any other AI agent) working in this repository.

## Project

A **peer-to-peer multiplayer auto-battler** built for InnoJam. The concept mixes a
**rap crew manager** with **Super Auto Pets**: players sign unique MCs and support members (DJ, hype man…) from a
league-wide player market with sealed bidding rounds and arrange them in a shop phase, then two
crews face off in a rap battle that is simulated automatically. Units grow as they play. Crews persist, cost salary and age. Each player owns one crew
in their friend group's league, a pyramid of divisions whose seasons span many short sittings, with
AI managers for bots and absent players (see `plan/decisions.md`, D-007 to D-013, D-029 to D-032 and D-039 to D-042).

- **All code and art is AI-generated.** Art is made from simple shapes drawn procedurally
  at runtime. There are no image or audio files unless a decision in `plan/decisions.md` says otherwise;
  sound is procedural WebAudio (D-051).
- **High code quality is a hard requirement**, not a nice-to-have. Nobody reviews the code
  by hand, so the type checker, linters and tests are the review.
- The working repo name is `rap-battle`. The game is called **Mic Drop League** (D-048).

## Where things stand → `plan/`

Before you start any work, read these:

1. `plan/tasks.md`: what is being worked on now and what comes next.
2. `plan/roadmap.md`: the milestones and their exit criteria.
3. `plan/open-questions.md`: design questions that are still unanswered. Don't invent
   answers to questions marked **blocking**. Ask the user instead.
4. `plan/decisions.md`: decisions already made. Don't reopen them without a reason.

The game rules (round flow, battle, economy, league, roster, abilities and all tunable numbers)
are in `docs/game-design.md`. `core/` must match it. If you change a rule, change the document in
the same change.

When you finish a unit of work, update `plan/tasks.md` and add an entry to `plan/log.md`.
The full workflow is in `plan/README.md`.

## Tech stack

Decided (see `plan/decisions.md`, D-001 to D-006, D-014 and D-017). The toolchain is set up; see **Commands** below.
Entry point: `index.html` → `src/app/main.ts`. Unit tests sit next to the code as `src/**/*.test.ts` (shared `core/` test builders are in `src/core/testing/`); browser tests live in `e2e/`.

- **TypeScript 5.9** with `strict` plus extra flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …), built and served by **Vite 8**
- **Phaser 3** (3.90, not Phaser 4) for rendering, input and tweens. All visuals are drawn with `Graphics`/shapes/text.
- **PeerJS** (WebRTC data channels) for P2P. **zod** validates every network message.
- **Vitest 4** for unit tests (Vitest 5 needs Node 22) and **Playwright** for end-to-end tests (a three-tab P2P sitting over a local `peer` server)
- **ESLint 10** (typescript-eslint `strictTypeChecked`) and **Prettier 3**. `eslint.config.js` also enforces the layer rules below (D-016).

## Architecture rules

```
src/
  core/    pure game rules: units, abilities, shop, economy, battle sim, league, seeded RNG,
           and the zod schema of the league save
  net/     PeerJS wrapper, lobby, league host, message schemas, handshake
  render/  Phaser scenes and procedural shape art; plays back battle event logs
  app/     wiring, crew save/load and game-flow state machine (lobby → shop → lock-in → battle → result)
```

1. **`core/` is pure and deterministic.** It never imports Phaser, PeerJS, the DOM,
   `Math.random`, `Date` or timers. All randomness comes from the seeded RNG that is passed in.
   Its only library is zod, for the league save schema (D-070).
2. **The battle sim is a pure function**: `simulateBattle(crewA, crewB, seed) → BattleEvent[]`.
   Both peers run it locally. The only things sent over the network are crew lineups, seeds,
   lock-in messages, market bids and bid results (D-040) and the league state snapshot the host
   sends after each round (standings, schedule, crews, player market; D-031), never battle state.
3. **`render/` only visualises.** It consumes event logs and core state and never
   decides game outcomes.
4. Dependencies only point inward: `app → render/net → core`. `core` depends on nothing in the project.
5. Game content (units, abilities, battle styles, numbers) lives in typed data tables in `core/`.
   Abilities are data plus small named effect functions, not scattered special cases.

## Code quality rules

- No `any`, no non-null `!` assertions, and no `@ts-ignore` without a comment explaining why.
- Every change to `core/` comes with tests. Determinism tests (same seed → same events)
  are required for the sim.
- Before you call a task done, `make check` must pass (type check, lint, format, tests).
- Keep functions small and names descriptive, and prefer plain data and functions over class hierarchies.
- Never commit a failing build. Keep commits small, one task per commit where possible.

## Commands

Each target calls the matching npm script in `package.json`.

| Command | Purpose |
|---|---|
| `make install` | install dependencies (`npm ci`) |
| `make dev` | start the Vite dev server on http://localhost:5173 |
| `make peer-server` | start a local PeerJS signalling server on port 9000 (open the game with `?peer=localhost:9000`) |
| `make check` | typecheck (`tsc -b`) + lint + format check + unit tests. Run it before calling any task done |
| `make test` | unit tests only (Vitest) |
| `make test-e2e` | Playwright tests; starts the dev server and a local PeerJS server itself (or reuses running ones) |
| `make build` | typecheck + production build to `dist/` |
| `make format` | fix formatting and auto-fixable lint errors |
| `make balance` | print battle and economy statistics of AI-played leagues (T-031, `tooling/balance-report.test.ts`) |

## Environment notes

- The dev container provides Node 20 and has an outbound firewall that blocks the public PeerJS
  signalling server (`0.peerjs.com`). Multiplayer runs in the container go through a local one:
  `make peer-server` and `?peer=localhost:9000` (D-078). Headless Chromium needs
  `--disable-features=WebRtcHideLocalIpsWithMdns` to connect two of its own tabs.
- The firewall also blocks Playwright's browser download. Chromium is baked into the
  container image instead (D-018), so after changing the `@playwright/test` version the
  container has to be rebuilt (`make dev-rebuild` on the host).
- Development pages: `http://localhost:5173/?gallery` shows the art and `?battle=<seed>` plays
  demo battles (`src/app/dev.ts`). Headless Chromium in the container renders at only about
  15 to 20 fps (software WebGL), so browser tests wait on named targets
  (`window.micDropTargets()`, `src/render/ui/targets.ts`) rather than on fixed times.
- The workspace is bind-mounted from a macOS host and `node_modules` is a container-only
  volume (D-015). `make` may warn about clock skew; that is harmless.
