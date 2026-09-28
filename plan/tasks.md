# Tasks

States: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped.
Next free ID: **T-054**

## Now

- [ ] T-048 (M2) Design session 5: shop and progression. Progression without tiers (Q-017, D-037), shop size, buy/roll/sell costs, freeze, merging and levels, the gold economy (no catch-up gold, D-027). After T-047
- [ ] T-049 (M2) Design session 6: roster and abilities. Unit by unit: names, personality, stats, abilities; the trigger, effect and target lists; which unit types are missing; hype effects and triggers and per-unit `hypeBonus` values (Q-016); per-unit base salaries (D-037); a real ability for Vocal Coach and a unit that uses `upkeep` (D-036). After T-048
- [ ] T-050 (M2) Design session 7: presentation. Look of the shape-art characters, the screens and their layout, sound (Q-010), the game title. After T-049

## Next

- [ ] T-051 (M2) Paper playtest with the user: play at least 3 rounds between two crews by hand from `docs/game-design.md` and fix every gap or unclear rule found. After T-050
- [ ] T-052 (M2) Design wrap-up: consistency pass over `docs/game-design.md` and the tunables table, then update the M3+ tasks in `tasks.md` and the exit criteria in `roadmap.md` to match the new design. After T-051
- [ ] T-010 (M3) Seeded PRNG (e.g. mulberry32) with `fork()` for independent streams, plus tests
- [ ] T-011 (M3) Core types: `UnitDef` (with base salary, no tier), `UnitInstance` (with age in years, `stageName`, `record`), `Crew` (3 MC + 2 support + 3 bench, hall of fame), `BattleEvent` (a discriminated union)
- [ ] T-012 (M3) Data tables for the roster from T-009 and the tunables table (`docs/game-design.md` §8, §10)
- [ ] T-013 (M3) Ability and trigger system (e.g. on battle start, on bar landed, on leaving the stage, on buy), built from data plus named effect functions; support position-aware abilities and per-ability `hypeBonus` scaling (D-034)
- [ ] T-014 (M3) `simulateBattle()` behind a `BattleStyle` interface with the "front MCs clash" style (D-010): alternating turns (D-033), hype meters (D-034) and the no-draw end rules (D-035); emits an event log
- [ ] T-015 (M3) Tests: one or more per ability, same seed gives the same log, property test that every battle ends with exactly one winner

## Later

- [ ] T-016 (M4) Shop generation from the whole roster with seeded signing ages (D-037, D-038), plus roll and freeze
- [ ] T-017 (M4) Buy, sell, reorder, bench, merge and level-up rules
- [ ] T-018 (M4) Crew upkeep: gold income and salary payments each round; at the season end, retirement, ageing, farewell-tour announcements and the hall of fame (D-038)
- [ ] T-019 (M4) AI manager (simple greedy shop policy, seeded) that runs filler bots and absent players' crews (D-030), plus a headless test where AI managers play a multi-season league
- [ ] T-034 (M4) League rules in `core/`: divisions with even counts (auto-added bots), double round robin pairing, standings and tiebreaks, season end with promotion, relegation and titles, newcomer takes over a bot, a leaving player's crew becomes a bot (§7, D-029)
- [ ] T-035 (M4) League state save format (all members and crews, schedule, results; zod-validated, versioned) and localStorage save/load in `app/` (D-031)
- [ ] T-020 (M5) Procedural shape art: a crew-member "portrait" generator built from the def (shape, colour, outfit, mic/turntable props)
- [ ] T-021 (M5) Phaser shop scene with drag and drop, including the MC/support slots and the bench
- [ ] T-022 (M5) Phaser battle scene that plays back `BattleEvent[]` with tweens: turn-by-turn bars, both hype meters with a reacting crowd, 2× speed, 30–60 s per battle (D-033, D-034)
- [ ] T-023 (M5) Game-flow state machine in `app/`, a result screen and a league standings screen
- [ ] T-024 (M5) Playwright test that clicks through one full round against the bot
- [ ] T-025 (M6) PeerJS wrapper with host/join by room code, and a lobby UI
- [ ] T-026 (M6) zod message schemas and a protocol version handshake
- [ ] T-036 (M6) League host: any member hosts N guests (star topology), adopts the newest league state, runs AI managers for bots and absent players, starts battles once all have locked in, and broadcasts the league state after each round (D-031)
- [ ] T-027 (M6) Seed agreement (commit–reveal from both peers so neither can pick it) and simultaneous lock-in
- [ ] T-028 (M6) Result-hash check that detects desyncs, plus disconnect handling: host drop voids the round and anyone re-hosts, player drop locks the current lineup (D-031)
- [ ] T-053 (M6) Lobby shows who is still shopping; nudge message; optional host shop timer (`SHOP_TIMER_SECONDS`) that locks the current lineup, selling cheapest units if the payroll is unaffordable (D-032)
- [ ] T-029 (M6) Playwright multi-tab league test (3+ tabs, PeerJS server running locally for CI)
- [ ] T-037 (M7) Add a second battle style through the `BattleStyle` interface (e.g. verse rounds scored by the crowd)
- [ ] T-030 (M7) Effects, screen shake and procedural WebAudio sound (beats, scratches, crowd)
- [ ] T-031 (M7) Balance pass using headless bot-vs-bot win-rate statistics, including salary and retirement pacing
- [ ] T-032 (M8) Deploy a static build; test P2P across two real networks; decide whether a TURN server is needed
- [ ] T-033 (M8) Write the jam submission page and a known-issues list
- [ ] T-041 (M8) Decide with the user whether to commit `.devcontainer/project/` (the Chromium build step, D-018, and the `node_modules` volume, D-015) so other machines get them; today all of `.devcontainer/` is gitignored

## Done

- [x] T-047 (M2) Design session 4: crew management. Stamina cut, bench of 3 as storage, no unit tiers with per-unit salary, age in seasons with a known retirement age by role, a farewell season and a hall of fame (D-036 to D-038) (2026-09-28)
- [x] T-046 (M2) Design session 3: the battle. Alternating turns, a hype meter per crew that scales each ability, no draws, 30–60 s playback (D-033 to D-035) (2026-09-28)
- [x] T-045 (M2) Design session 2: core loop, persistence and league. One league per group and one crew per player, double-round-robin seasons over sittings, AI managers, a copied league state, and an optional shop timer (D-029 to D-032) (2026-09-28)
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
