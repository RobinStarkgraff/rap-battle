# CLAUDE.md

Guidance for Claude Code (and any other AI agent) working in this repository.

## Project

A **peer-to-peer multiplayer auto-battler** built for InnoJam. The concept mixes a
**rap crew manager** with **Super Auto Pets**: players draft and arrange a crew of MCs and
support members (DJ, hype man…) in a shop phase, then two crews face off in a rap battle
that is simulated automatically. Crews persist, cost salary and age, and friends play an
endless session league with divisions (see `plan/decisions.md`, D-007 to D-013).

- **All code and art is AI-generated.** Art is made from simple shapes drawn procedurally
  at runtime. There are no image assets unless a decision in `plan/decisions.md` says otherwise.
- **High code quality is a hard requirement**, not a nice-to-have. Nobody reviews the code
  by hand, so the type checker, linters and tests are the review.
- The working repo name is `rap-battle`. The game's final title is still open.

## Where things stand → `plan/`

Before you start any work, read these:

1. `plan/tasks.md`: what is being worked on now and what comes next.
2. `plan/roadmap.md`: the milestones and their exit criteria.
3. `plan/open-questions.md`: design questions that are still unanswered. Don't invent
   answers to questions marked **blocking**. Ask the user instead.
4. `plan/decisions.md`: decisions already made. Don't reopen them without a reason.

When you finish a unit of work, update `plan/tasks.md` and add an entry to `plan/log.md`.
The full workflow is in `plan/README.md`.

## Tech stack

Decided (see `plan/decisions.md`, D-001 to D-006 and D-014). The Vite + TS + Phaser scaffold exists; lint and test tooling are still being set up (milestone M0).
Entry point: `index.html` → `src/app/main.ts`. Until the Makefile targets exist, use `npm run dev`, `npm run build` and `npm run typecheck`.

- **TypeScript 5.9** with `strict` plus extra flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …), built and served by **Vite 8**
- **Phaser 3** (3.90, not Phaser 4) for rendering, input and tweens. All visuals are drawn with `Graphics`/shapes/text.
- **PeerJS** (WebRTC data channels) for P2P. **zod** validates every network message.
- **Vitest** for unit tests and **Playwright** for end-to-end tests (multi-tab P2P league)
- **ESLint** (typescript-eslint, strict) and **Prettier**

## Architecture rules

```
src/
  core/    pure game rules: units, abilities, shop, economy, battle sim, league, seeded RNG
  net/     PeerJS wrapper, lobby, league host, message schemas, handshake
  render/  Phaser scenes and procedural shape art; plays back battle event logs
  app/     wiring, crew save/load and game-flow state machine (lobby → shop → lock-in → battle → result)
```

1. **`core/` is pure and deterministic.** It never imports Phaser, PeerJS, the DOM,
   `Math.random`, `Date` or timers. All randomness comes from the seeded RNG that is passed in.
2. **The battle sim is a pure function**: `simulateBattle(crewA, crewB, seed) → BattleEvent[]`.
   Both peers run it locally. The only things sent over the network are crew lineups, seeds,
   lock-in messages and the league host's pairings and standings, never battle state.
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

_Filled in once M0 is done._ Planned:

| Command | Purpose |
|---|---|
| `make install` | install dependencies |
| `make dev` | start the Vite dev server |
| `make check` | typecheck + lint + format check + unit tests |
| `make test-e2e` | Playwright tests, including the multi-peer league round |
| `make build` | production build to `dist/` |

## Environment notes

- The dev container provides Node 20 and has an outbound firewall. Real P2P tests that go
  through the public PeerJS signalling server (`0.peerjs.com`) may need to be allowlisted,
  or run from the host browser.
