# Tasks

States: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped.
Next free ID: **T-038**

## Now

- [ ] T-002 (M0) Scaffold Vite + TypeScript (strict) + Phaser 3 in `/workspace`, with the `src/{core,net,render,app}` layout
- [ ] T-003 (M0) Add ESLint (typescript-eslint strict), Prettier and an import-boundary rule that stops `core/` importing Phaser, PeerJS or DOM code
- [ ] T-004 (M0) Add Vitest with a first `core/` test; add Playwright with a smoke test that loads the page

## Next

- [ ] T-005 (M0) Add Makefile targets `install`, `dev`, `check`, `test-e2e`, `build`; fill in the Commands section of CLAUDE.md (a `Makefile` already exists, so look at it first)
- [ ] T-006 (M0) Clean up `.gitignore` (it still has entries from another project, e.g. `public/` and `deploy.log`); add `node_modules/`, `dist/`, `test-results/`
- [ ] T-007 (M0) Optional: pre-commit hook or GitHub Actions workflow that runs `make check`
- [ ] T-008 (M1) Write `docs/game-design.md` from the answered questions (D-007 to D-013): shop and round flow, the front-MC clash battle, stage positions, stamina and bench rest, salary, age and retirement, economy, and the division league. Propose tunable defaults for Q-011
- [ ] T-009 (M1) Design the starting roster (about 10 units, MCs and support, 3 tiers) and 5–8 ability trigger types
- [ ] T-010 (M2) Seeded PRNG (e.g. mulberry32) with `fork()` for independent streams, plus tests
- [ ] T-011 (M2) Core types: `UnitDef`, `UnitInstance` (with stamina, age, salary), `Crew` (3 MC + 2 support + bench), `BattleEvent` (a discriminated union)
- [ ] T-012 (M2) Data tables for the roster from T-009
- [ ] T-013 (M2) Ability and trigger system (e.g. on battle start, on bar landed, on leaving the stage, on buy), built from data plus named effect functions; support position-aware abilities
- [ ] T-014 (M2) `simulateBattle()` behind a `BattleStyle` interface with the "front MCs clash" style (D-010), which emits an event log
- [ ] T-015 (M2) Tests: one or more per ability, same seed gives the same log, property test that every battle ends

## Later

- [ ] T-016 (M3) Shop generation by tier and round, plus roll and freeze
- [ ] T-017 (M3) Buy, sell, reorder, bench, merge and level-up rules
- [ ] T-018 (M3) Crew upkeep between rounds: gold income, salary payments, stamina use and bench recovery, ageing and retirement
- [ ] T-019 (M3) Simple bot player and a headless test where bots play a multi-season league
- [ ] T-034 (M3) League rules in `core/`: divisions, standings, 1v1 pairing with byes, season end with promotion and relegation
- [ ] T-035 (M3) Crew save format (zod-validated, versioned) and localStorage save/load in `app/`
- [ ] T-020 (M4) Procedural shape art: a crew-member "portrait" generator built from the def (shape, colour, outfit, mic/turntable props)
- [ ] T-021 (M4) Phaser shop scene with drag and drop, including the MC/support slots and the bench
- [ ] T-022 (M4) Phaser battle scene that plays back `BattleEvent[]` with tweens
- [ ] T-023 (M4) Game-flow state machine in `app/`, a result screen and a league standings screen
- [ ] T-024 (M4) Playwright test that clicks through one full round against the bot
- [ ] T-025 (M5) PeerJS wrapper with host/join by room code, and a lobby UI
- [ ] T-026 (M5) zod message schemas and a protocol version handshake
- [ ] T-036 (M5) League host: one peer hosts N guests (star topology), sends pairings and standings, and relays battle messages between paired peers
- [ ] T-027 (M5) Seed agreement (commit–reveal from both peers so neither can pick it) and simultaneous lock-in
- [ ] T-028 (M5) Result-hash check that detects desyncs, plus disconnect and reconnect handling (see Q-013)
- [ ] T-029 (M5) Playwright multi-tab league test (3+ tabs, PeerJS server running locally for CI)
- [ ] T-037 (M6) Add a second battle style through the `BattleStyle` interface (e.g. verse rounds scored by the crowd)
- [ ] T-030 (M6) Effects, screen shake and procedural WebAudio sound (beats, scratches, crowd)
- [ ] T-031 (M6) Balance pass using headless bot-vs-bot win-rate statistics, including salary and retirement pacing
- [ ] T-032 (M7) Deploy a static build; test P2P across two real networks; decide whether a TURN server is needed
- [ ] T-033 (M7) Write the jam submission page and a known-issues list

## Done

- [x] T-001 (M1) Get answers from the user to the blocking questions in `open-questions.md` (Q-001 to Q-006) (2026-09-28)
