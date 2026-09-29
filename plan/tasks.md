# Tasks

States: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped.
Next free ID: **T-055**

## Now

- [ ] T-051 (M2) Paper playtest with the user: play at least 3 rounds between two crews by hand from `docs/game-design.md` and fix every gap or unclear rule found. After T-050
- [ ] T-052 (M2) Design wrap-up: consistency pass over `docs/game-design.md` and the tunables table, then update the M3+ tasks in `tasks.md` and the exit criteria in `roadmap.md` to match the new design. After T-051
- [ ] T-010 (M3) Seeded PRNG (e.g. mulberry32) with `fork()` for independent streams, plus tests

## Next

- [ ] T-011 (M3) Core types: `ArchetypeDef`, `AbilityDef`, `Unit` (an individual: stats, 1–2 abilities with power, xp, age, salary, `look` seed, `stageName`, `record`), `Crew` (name, two colours and a logo, 3 MC + 2 support + 3 bench, hall of fame; D-052), `BattleEvent` (a discriminated union)
- [ ] T-012 (M3) Data tables for the 10 archetypes, the 32 abilities, the stage name lists, the bot crew name lists, the crew colours and logos, and the tunables table (`docs/game-design.md` §2, §8, §10, §11; D-043, D-047, D-052)
- [ ] T-013 (M3) Ability and trigger system (e.g. on battle start, on bar landed, on leaving the stage, on sign), built from data plus named effect functions; support position-aware and `oncePerBattle` abilities, fixed and hype-based values (D-044), the `buff`, `diss`, `hype`, `gold` and `xp` effects and the `beforeBattle` trigger (D-045), ability `power`, and units with two abilities (D-041)
- [ ] T-014 (M3) `simulateBattle()` behind a `BattleStyle` interface with the "front MCs clash" style (D-010): alternating turns (D-033), hype meters (D-034) and the no-draw end rules (D-035); emits an event log
- [ ] T-015 (M3) Tests: one or more per ability, same seed gives the same log, property test that every battle ends with exactly one winner

## Later

- [ ] T-016 (M4) Player market in `core/`: unit generation from archetypes (stats, ability, weighted age, `look` seed, unique stage name), the public list (start pool, rookies, cap), rating with the youth premium, ask and personal scouting (D-039, D-040, D-042, D-046, D-047)
- [ ] T-017 (M4) Bidding rounds as a pure function (affordability, highest bid, tie order, early end), scouted signings, release to the pool, and arranging slots and bench (D-040)
- [ ] T-018 (M4) Crew upkeep: gold income, `upkeep` abilities, the wallet cap and salary payments each round; xp and growth steps and the second ability after battles (D-041); at the season end, retirement (crews and pool), ageing, farewell-tour announcements, salary renegotiation and the hall of fame (D-038, D-042)
- [ ] T-019 (M4) AI manager (simple greedy bidding and scouting policy, seeded) that runs filler bots and absent players' crews (D-030), plus a headless test where AI managers play a multi-season league
- [ ] T-034 (M4) League rules in `core/`: divisions with even counts (auto-added bots with generated names, colours and logos, D-052), unique crew names, double round robin pairing, standings and tiebreaks, season end with promotion, relegation and titles, newcomer takes over a bot, a leaving player's crew becomes a bot (§7, D-029)
- [ ] T-035 (M4) League state save format (all members and crews, schedule, results; zod-validated, versioned) and localStorage save/load in `app/` (D-031)
- [ ] T-020 (M5) Procedural shape art: a paper-cut figure generator drawn from the unit's `look` seed with the outfit in crew colours, the archetype icon badge and name plate, bling per growth step, farewell grey hair and sash; crew logos; the block party backdrop (`docs/game-design.md` §11, D-049)
- [ ] T-021 (M5) Phaser Market and Lineup tabs: the sortable scouting table with a detail panel and bid input, bidding rounds and results, scouting, and drag and drop into the MC/support slots and the bench (D-050)
- [ ] T-022 (M5) Phaser battle scene that plays back `BattleEvent[]` with tweens: the side-view face-off, turn-by-turn bars with comic words and damage numbers, ability banners, seeded one-liners, both hype meters with a reacting crowd, 2× speed, 30–60 s per battle (D-033, D-034, D-050)
- [ ] T-023 (M5) Game-flow state machine in `app/`: title screen, crew founding (name, colours, logo), the home hub with its League and Hall of Fame tabs and Lock in button, and the headline result screen with MVP (D-050, D-052)
- [ ] T-054 (M5) Comedy text tables in `render/`: comic hit words, one-liner templates for chokes, abilities and big hype swings, and tabloid result headlines, picked with a seed derived from the battle seed (invented lines only, `docs/game-design.md` §11)
- [ ] T-024 (M5) Playwright test that clicks through one full round against the bot
- [ ] T-025 (M6) PeerJS wrapper with host/join by room code, and a lobby UI
- [ ] T-026 (M6) zod message schemas and a protocol version handshake
- [ ] T-036 (M6) League host: any member hosts N guests (star topology), adopts the newest league state, runs AI managers for bots and absent players, collects and resolves the bidding rounds (D-040), starts battles once all have locked in, and broadcasts the league state after each round (D-031)
- [ ] T-027 (M6) Seed agreement (commit–reveal from both peers so neither can pick it) and simultaneous lock-in
- [ ] T-028 (M6) Result-hash check that detects desyncs, plus disconnect handling: host drop voids the round and anyone re-hosts, player drop locks the current lineup (D-031)
- [ ] T-053 (M6) Lobby shows who is still shopping; nudge message; optional host shop timer (`SHOP_TIMER_SECONDS`) per bidding round and for the lineup, which passes open bids and locks the current lineup, releasing the cheapest units if the payroll is unaffordable (D-032, D-040)
- [ ] T-029 (M6) Playwright multi-tab league test (3+ tabs, PeerJS server running locally for CI)
- [ ] T-037 (M7) Add a second battle style through the `BattleStyle` interface (e.g. verse rounds scored by the crowd)
- [ ] T-030 (M7) Effects, screen shake and procedural WebAudio sound: one seeded beat per battle that builds with hype and drops on chokes, SFX for battle and shop, on at 40% with mute and volume saved in the browser (D-051)
- [ ] T-031 (M7) Balance pass using headless bot-vs-bot win-rate statistics, including salary and retirement pacing
- [ ] T-032 (M8) Deploy a static build; test P2P across two real networks; decide whether a TURN server is needed
- [ ] T-033 (M8) Write the jam submission page and a known-issues list
- [ ] T-041 (M8) Decide with the user whether to commit `.devcontainer/project/` (the Chromium build step, D-018, and the `node_modules` volume, D-015) so other machines get them; today all of `.devcontainer/` is gitignored

## Done

- [x] T-050 (M2) Design session 7: presentation. Title *Mic Drop League*, a 90s block party look with paper-cut figures rolled from a `look` seed and archetype badges, crew name/colours/logo, a home hub with tabs, side-view battle, scouting-table market, headline result screen, and procedural sound (D-048 to D-052, Q-010) (2026-09-29)
- [x] T-049 (M2) Design session 6: roster and abilities. 5 MC and 5 support archetypes with 32 abilities, crowd abilities valued from hype instead of `hypeBonus`, 3 new effects and a `beforeBattle` trigger, a youth premium in the rating, stage name lists (D-043 to D-047, Q-016) (2026-09-28)
- [x] T-048 (M2) Design session 5: shop and progression. A league-wide market of unique generated units, sealed bidding rounds, personal scouting, no merging or levels, growth by playing with a random second ability, value-based ask and salary (D-039 to D-042) (2026-09-28)
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
