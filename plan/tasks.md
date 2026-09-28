# Tasks

States: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped.
Next free ID: **T-053**

## Now

- [ ] T-045 (M2) Design session 2: core loop, persistence and league. Round flow, how a session starts and ends, league shape (confirm or change the Q-011 proposal in §7), bots or ghost crews (Q-008), save validation (Q-012), host disconnect (Q-013), slow or absent players with no shop timer (Q-014). After T-044
- [ ] T-046 (M2) Design session 3: the battle. How a rap battle should feel and read on screen, the front-MC clash rules, stage positions, draws, the exchange limit, whether the crowd plays a part. After T-045
- [ ] T-047 (M2) Design session 4: crew management. Stamina and bench rest, salary, age and retirement, and whether they make for fun decisions or chores. Targets for how long a unit stays and how often players rotate. After T-046

## Next

- [ ] T-048 (M2) Design session 5: shop and progression. Tiers and unlocks, shop size, buy/roll/sell costs, freeze, merging and levels, the gold economy (no catch-up gold, D-027). After T-047
- [ ] T-049 (M2) Design session 6: roster and abilities. Unit by unit: names, personality, stats, abilities; the trigger, effect and target lists; which unit types are missing. After T-048
- [ ] T-050 (M2) Design session 7: presentation. Look of the shape-art characters, the screens and their layout, sound (Q-010), the game title. After T-049
- [ ] T-051 (M2) Paper playtest with the user: play at least 3 rounds between two crews by hand from `docs/game-design.md` and fix every gap or unclear rule found. After T-050
- [ ] T-052 (M2) Design wrap-up: consistency pass over `docs/game-design.md` and the tunables table, then update the M3+ tasks in `tasks.md` and the exit criteria in `roadmap.md` to match the new design. After T-051
- [ ] T-010 (M3) Seeded PRNG (e.g. mulberry32) with `fork()` for independent streams, plus tests
- [ ] T-011 (M3) Core types: `UnitDef`, `UnitInstance` (with stamina, age, salary, `stageName`, `record`), `Crew` (3 MC + 2 support + bench), `BattleEvent` (a discriminated union)
- [ ] T-012 (M3) Data tables for the roster from T-009 and the tunables table (`docs/game-design.md` §8, §10)
- [ ] T-013 (M3) Ability and trigger system (e.g. on battle start, on bar landed, on leaving the stage, on buy), built from data plus named effect functions; support position-aware abilities
- [ ] T-014 (M3) `simulateBattle()` behind a `BattleStyle` interface with the "front MCs clash" style (D-010), which emits an event log
- [ ] T-015 (M3) Tests: one or more per ability, same seed gives the same log, property test that every battle ends

## Later

- [ ] T-016 (M4) Shop generation by tier and round, plus roll and freeze
- [ ] T-017 (M4) Buy, sell, reorder, bench, merge and level-up rules
- [ ] T-018 (M4) Crew upkeep between rounds: gold income, salary payments, stamina use and bench recovery, ageing and retirement
- [ ] T-019 (M4) Simple bot player and a headless test where bots play a multi-season league
- [ ] T-034 (M4) League rules in `core/`: divisions, standings, 1v1 pairing with byes, season end with promotion and relegation
- [ ] T-035 (M4) Crew save format (zod-validated, versioned) and localStorage save/load in `app/`
- [ ] T-020 (M5) Procedural shape art: a crew-member "portrait" generator built from the def (shape, colour, outfit, mic/turntable props)
- [ ] T-021 (M5) Phaser shop scene with drag and drop, including the MC/support slots and the bench
- [ ] T-022 (M5) Phaser battle scene that plays back `BattleEvent[]` with tweens
- [ ] T-023 (M5) Game-flow state machine in `app/`, a result screen and a league standings screen
- [ ] T-024 (M5) Playwright test that clicks through one full round against the bot
- [ ] T-025 (M6) PeerJS wrapper with host/join by room code, and a lobby UI
- [ ] T-026 (M6) zod message schemas and a protocol version handshake
- [ ] T-036 (M6) League host: one peer hosts N guests (star topology), sends pairings and standings, and relays battle messages between paired peers
- [ ] T-027 (M6) Seed agreement (commit–reveal from both peers so neither can pick it) and simultaneous lock-in
- [ ] T-028 (M6) Result-hash check that detects desyncs, plus disconnect and reconnect handling (see Q-013)
- [ ] T-029 (M6) Playwright multi-tab league test (3+ tabs, PeerJS server running locally for CI)
- [ ] T-037 (M7) Add a second battle style through the `BattleStyle` interface (e.g. verse rounds scored by the crowd)
- [ ] T-030 (M7) Effects, screen shake and procedural WebAudio sound (beats, scratches, crowd)
- [ ] T-031 (M7) Balance pass using headless bot-vs-bot win-rate statistics, including salary and retirement pacing
- [ ] T-032 (M8) Deploy a static build; test P2P across two real networks; decide whether a TURN server is needed
- [ ] T-033 (M8) Write the jam submission page and a known-issues list
- [ ] T-041 (M8) Decide with the user whether to commit `.devcontainer/project/` (the Chromium build step, D-018, and the `node_modules` volume, D-015) so other machines get them; today all of `.devcontainer/` is gitignored

## Done

- [x] T-044 (M2) Design session 1: vision and pillars. Pillars section at the top of `docs/game-design.md` (D-026 to D-028) (2026-09-28)
- [-] T-043 (M4) Confirm the proposed league defaults (Q-011): folded into T-045 (2026-09-28)
- [x] T-009 (M1) Design the starting roster (11 units: 7 MCs, 4 support, 3 tiers) and 7 ability trigger types, in `docs/game-design.md` §8–§9 (2026-09-28)
- [x] T-008 (M1) Write `docs/game-design.md`: round flow, shop, front-MC clash battle, stage positions, stamina, salary, age and retirement, league (proposed Q-011 defaults) and a tunables table (2026-09-28)
- [x] T-042 (M0) Confirm the CI workflow is green: runs #1 (51c5172) and #2 (a4881ac) both passed the `check` and `e2e` jobs (2026-09-28)
- [x] T-038 (M0) Make Playwright browsers available in the dev container: Chromium is baked into the image (D-018) and `make test-e2e` passes inside the rebuilt container (2026-09-28)
- [x] T-007 (M0) GitHub Actions workflow that runs `make check`, `make build` and `make test-e2e` (2026-09-28)
- [x] T-006 (M0) Clean up `.gitignore` (2026-09-28)
- [x] T-040 (M0) Type-check `core/` with its own tsconfig that has no `DOM` lib (2026-09-28)
- [x] T-039 (M0) Regression test for the lint boundary rules via the ESLint Node API (2026-09-28)
- [x] T-005 (M0) Add Makefile targets `install`, `dev`, `check`, `test-e2e`, `build`; fill in the Commands section of CLAUDE.md (2026-09-28)
- [x] T-004 (M0) Add Vitest with a first `core/` test; add Playwright with a smoke test that loads the page (2026-09-28; the e2e run is verified in T-038)
- [x] T-003 (M0) Add ESLint (typescript-eslint strict), Prettier and an import-boundary rule that stops `core/` importing Phaser, PeerJS or DOM code (2026-09-28)
- [x] T-002 (M0) Scaffold Vite + TypeScript (strict) + Phaser 3 in `/workspace`, with the `src/{core,net,render,app}` layout (2026-09-28)
- [x] T-001 (M1) Get answers from the user to the blocking questions in `open-questions.md` (Q-001 to Q-006) (2026-09-28)
