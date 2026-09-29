# Tasks

States: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped.
Next free ID: **T-056**

## Now

- [ ] T-020 (M5) Procedural shape art: a paper-cut figure generator drawn from the unit's `look` seed with the outfit in crew colours, the archetype icon badge and name plate, bling per growth step, farewell grey hair and sash; crew logos; the block party backdrop (`docs/game-design.md` §11, D-049)
- [ ] T-021 (M5) Phaser Market and Lineup tabs: the sortable scouting table with a detail panel and bid input, bidding rounds and results, scouting, and drag and drop into the MC/support slots and the bench (D-050)
- [ ] T-022 (M5) Phaser battle scene that plays back `BattleEvent[]` with tweens: the side-view face-off, turn-by-turn bars with comic words and damage numbers, ability banners, seeded one-liners, both hype meters with a reacting crowd, 2× speed, 30–60 s per battle (D-033, D-034, D-050)

## Next

- [ ] T-023 (M5) Game-flow state machine in `app/`: title screen, crew founding (name, colours, logo), a new local league with bots, the home hub with its League and Hall of Fame tabs and Lock in button, and the headline result screen with MVP (D-050, D-052). Also set `GAME_TITLE` in `core/index.ts` (still `rap-battle`) to *Mic Drop League* (D-048)
- [ ] T-054 (M5) Comedy text tables in `render/`: comic hit words, one-liner templates for chokes, abilities and big hype swings, and tabloid result headlines, picked with a seed derived from the battle seed (invented lines only, `docs/game-design.md` §11)
- [ ] T-024 (M5) Playwright test that clicks through one full round of a local league with bots

## Later

- [ ] T-025 (M6) PeerJS wrapper with host/join by room code, and a lobby UI
- [ ] T-026 (M6) zod message schemas and a protocol version handshake
- [ ] T-036 (M6) League host: any member hosts N guests (star topology), adopts the newest league state, runs AI managers for bots and absent players, collects and resolves the bidding rounds (D-040), starts battles once all have locked in, broadcasts the league state after each round (D-031), and shows returning players a "while you were away" summary (D-030)
- [ ] T-027 (M6) Battle seed agreement after lock-in (commit–reveal from both peers so neither can pick it; the host stands in for AI-run crews) and simultaneous lock-in
- [ ] T-028 (M6) Result-hash check that detects desyncs, plus disconnect handling: host drop voids the round and anyone re-hosts, player drop locks the current lineup (D-031)
- [ ] T-053 (M6) Lobby shows who is still shopping; nudge message; optional host shop timer (`SHOP_TIMER_SECONDS`) per bidding round and for the lineup, which passes open bids and locks the current lineup, releasing the cheapest units if the payroll is unaffordable (D-032, D-040)
- [ ] T-029 (M6) Playwright multi-tab league test (3+ tabs, PeerJS server running locally for CI)
- [ ] T-037 (M7) Add a second battle style through the `BattleStyle` interface (e.g. verse rounds scored by the crowd)
- [ ] T-030 (M7) Effects, screen shake and procedural WebAudio sound: one seeded beat per battle that builds with hype and drops on chokes, SFX for battle and shop, on at 40% with mute and volume saved in the browser (D-051)
- [ ] T-031 (M7) Balance pass using headless AI-manager statistics: battles of 6 to 12 turns (D-054), setup knockouts, Drop the Beat stacking, Studio Session speed, the power 1 / 2 / 3 values of Studio Session, Voice Lessons and Negotiator, and salary and retirement pacing. The T-019 headless run fills about 4.9 of 5 active slots in season 1 but only about 3 from season 3: renegotiated salaries of grown units (4 to 5 each) plus an ask no longer fit under `WALLET_CAP = 20`, and only 3 rookies a round enter for 12 crews
- [ ] T-032 (M8) Deploy a static build; test P2P across two real networks; decide whether a TURN server is needed
- [ ] T-033 (M8) Write the jam submission page and a known-issues list
- [ ] T-041 (M8) Decide with the user whether to commit `.devcontainer/project/` (the Chromium build step, D-018, and the `node_modules` volume, D-015) so other machines get them; today all of `.devcontainer/` is gitignored

## Done

- [x] T-019 (M4) AI manager in `src/core/ai/`: `AI_MANAGER` (MC-first best-value bids with a seeded taste, one upgrade bid, payroll kept within `BASE_INCOME`, scouting for empty slots, a slot-fit MC order, surplus release, payroll trim), plus headless tests where AI managers play 4 seasons of a 12-crew league and 5 seasons of a 4-crew one through `playRound()` (D-071) (2026-09-29)
- [x] T-035 (M4) League save: zod `leagueSchema` typed against the core types, `serializeLeague`/`parseLeague` with a versioned envelope and a migration table in `src/core/save/`, and `saveLeague`/`loadLeague`/`deleteLeague` over a `KeyValueStore` (`localStorage`) in `src/app/leagueStorage.ts`; zod 4 added (D-070) (2026-09-29)
- [x] T-055 (M4) A league round in `src/core/round/`: `startRound` (upkeep, rookies, shop phase), the shop actions (`roundScout`, `roundSignScouted`, `roundRelease`, `roundMove`, `roundBid`), `resolveBids`, `lockInCrew`/`forceLockInCrew`, `finishRound` (battles from given seeds, results, xp, season end), and `playRound()` driving them with a `CrewManager` per crew (D-069) (2026-09-29)
- [x] T-034 (M4) League rules in `src/core/league/`: the `League` state (divisions of schedule slots, results by slot), `createLeague` with seeded order and bot padding, bot identities, crew name checks, `doubleRoundRobin`, `divisionStandings` with tiebreaks and `leagueRanking`, `joinLeague` (bot takeover or waiting), `leaveLeague`, and `endSeason` in the §7 order with promotion and relegation (D-068) (2026-09-29)
- [x] T-018 (M4) Crew rounds and seasons in `src/core/career/`: `upkeep()` (income, win bonus, `upkeep` abilities, wallet cap), `applyBattleResult()` (records and stints from the event log, 1 xp with growth), and the season-end steps `recordSeason`, `retireUnits` (every former crew's hall of fame), `ageUnits` with farewell tours and `renegotiateSalaries` (D-067) (2026-09-29)
- [x] T-017 (M4) Shop phase in `src/core/shop/`: places, moves and `payroll` (`lineup.ts`), `signUnit`/`releaseUnit`, `bidsProblem` and `resolveBidRound` with tie order and `afterBidRound`, the `ShopCrew` actions that keep open bids valid, and `lockIn`/`forceLockIn` (D-066) (2026-09-29)
- [x] T-016 (M4) Player market in `src/core/market/`: `generateUnit()` (fixed roll order, pinned), weighted `rollAge()`, unique stage names (`core/names.ts`), the public list (`createMarket`, `addRookies` with `POOL_MAX`, free agents), `rating`/`askPrice`/`salaryFor` with the youth premium, and `scout()`; labelled seeds in `core/seeds.ts` (D-065) (2026-09-29)
- [x] T-015 (M3) Tests: `battle/abilities.test.ts` has a case per ability in a `Record<AbilityId, …>` (so the compiler requires all 32) plus two-ability order; `battle/properties.test.ts` runs 500 random battles for determinism, one winner, alternating turns, end reasons that match the stage, hype and damage bounds, and a pinned log snapshot (2026-09-29)
- [x] T-014 (M3) `simulateBattle(crewA, crewB, seed, style?)` in `src/core/battle/` behind a `BattleStyle` interface, with the "front MCs clash" style: setup steps, alternating turns, hype meters, the FIFO queue with choke, move-up and `oncePerBattle` rules, the no-draw end rules and MC margin; `battleEnd()` reads the result (D-064) (2026-09-29)
- [x] T-013 (M3) Ability system in `src/core/abilities/`: amounts by power and hype, trigger matching with `self`/`friend`, the `inSlot` condition, named target and effect functions that return operations, `sign` and `upkeep` resolution with permanent buffs, gold and xp, and `gainXp()` with growth steps and the second ability (D-063) (2026-09-29)
- [x] T-012 (M3) Data tables in `src/core/data/` (32 abilities, 10 archetypes with stage name words, shared prefixes and words, bot crew names, colour and logo names) and `src/core/tunables.ts`; tests check every trigger, subject, slot condition, target and effect is used, the pools, the name lists, and that §10 of the doc matches `TUNABLES` (2026-09-29)
- [x] T-011 (M3) Core types in `src/core/model/`: ability model (triggers, subjects, conditions, targets, `Amount`, 5 effects), archetypes, `Unit` (MC/support union), `Crew` with identity, slots, bench, wallet, hall of fame and record, `BattleLineup`, `BattleEvent`, crew unit helpers and test fixtures (D-062) (2026-09-29)
- [x] T-010 (M3) Seeded PRNG: mulberry32 `createRng()` with `int`, `chance`, `pick`, `weightedIndex`, `shuffle` and a stable `fork(label)`, plus `deriveSeed()` for league, round and crew seeds (D-061) (2026-09-29)
- [x] T-052 (M2) Design wrap-up: consistency pass over `docs/game-design.md` (v1: crew state, one season-end order, league and battle seeds, xp from abilities, `NAME_REROLLS`, unused `allCrewMCs` dropped), M3–M7 exit criteria and tasks reworded, new T-055 (`playRound()`). M2 is done (D-060) (2026-09-29)
- [x] T-051 (M2) Paper playtest: 3 rounds and a season end between two crews (`docs/playtest-1.md`). Fixed the economy (income 16, start 40), accepted short battles (6–12 turns), queued abilities of a choked MC still resolve, a hall of fame for every former crew, equal division sizes (Q-018), a bigger start pool with 3:2 roles, and 10 rule clarifications (D-053 to D-059) (2026-09-29)
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
