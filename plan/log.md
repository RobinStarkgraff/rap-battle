# Session log

Newest first. Keep each entry to a few lines: what was done, what's next, any problems.

## 2026-09-29 (T-052, design wrap-up; M2 done)
- Consistency pass over `docs/game-design.md`, now marked **v1**. Added a crew state table (wallet, hall of fame, a crew `record` for titles), one league-wide season-end order in §7, the league, season and battle seeds, xp from abilities, `NAME_REROLLS`, and a §12 that lists what is left to T-031. Dropped the unused `allCrewMCs` target. No new game rules (D-060).
- `roadmap.md`: M2 is **done**. The M3 to M7 exit criteria now match the design (the M5 shop scene still said "buy, sell, roll, freeze").
- `tasks.md`: T-011 to T-014, T-016 to T-019, T-023, T-024, T-027, T-031, T-034 to T-036 reworded; new **T-055** `playRound()` (M4); T-012 moved into Now.
- **Next:** M3 with T-010 (seeded PRNG).

## 2026-09-29 (T-051, paper playtest)
- Played a 2-crew league by hand from `docs/game-design.md`: 3 rounds plus the season end, with crew B run by the greedy AI policy. The record is in `docs/playtest-1.md`.
- **Economy stalled** as written: 25 gold couldn't pay for a first lineup plus its payroll, and 10 income couldn't carry 5 salaries. The user chose more income: `BASE_INCOME = 16`, `STARTING_GOLD = 40` (D-053).
- **Battles ran 3 to 8 turns** (the target was 12 to 24), with frequent knockouts in setup. The user **accepted short battles**: the target is now 6 to 12 turns with more screen time per turn (D-054).
- The user's answers: queued abilities of a choked MC still resolve (D-055, against the recommendation); retirees enter the hall of fame of **every** crew they played for, including releases retiring from the pool (D-056); **Q-018:** bots pad every division to one even size (D-057); the start pool is 6 per member, with roles drawn 3 : 2 (D-058). 10 more gaps were clarified without a real alternative (D-059), among them rookies per league round, won-unit placement, queue order after a bar and diss hype once per ability.
- T-014, T-019 and T-034 were reworded. No open design questions are left; only Q-015 and Q-009 (tech) remain. `make check` passes.
- **Next:** T-052 (design wrap-up), then M3 with T-010.

## 2026-09-29 (T-050, design session 7: presentation)
- Ran design session 7 with the user over four rounds of questions. Added `docs/game-design.md` §11 **Presentation** (title, look, screens, battle, result screen, sound) and a **Crew identity** section in §2, added `look` to the unit state and `CREW_NAME_MAX` to the tunables; "Still open" is now §12.
- **Title: Mic Drop League** (D-048); CLAUDE.md updated.
- **Look:** a 90s block party (the user chose it over the recommended neon club) with chunky paper-cut figures. Looks are **fully random** from a new `Unit.look` seed with no link to the archetype, so the archetype shows as an icon badge by the name plate. Bling per growth step, grey hair and a sash in the farewell season, and framed hall-of-fame portraits (D-049).
- **Screens:** a home hub with Market / Lineup / League / Hall of Fame tabs; a side-view face-off battle; the market is a **sortable scouting table** (the user chose it over cards); comic words plus seeded one-liners; a tabloid headline result screen with an MVP (D-050).
- **Sound (Q-010 answered):** one seeded procedural beat that builds with hype, plus SFX, on at 40% by default (D-051). **Crew identity:** a typed name, two colours and a logo; bots get *The ⟨adjective⟩ ⟨noun⟩* names (D-052).
- T-011, T-012, T-016, T-020 to T-023, T-030 and T-034 were reworded; new T-054 (comedy text tables). T-010 moved into Now.
- **Next:** T-051 (paper playtest).

## 2026-09-28 (T-049, design session 6: roster and abilities)
- Ran design session 6 with the user over three rounds of questions. Rewrote `docs/game-design.md` §8 (archetypes, 32 abilities, stage names) and §9 (8 triggers, conditions, values, 5 effects, targets), and updated §2, §3 (upkeep order), §4 (rating), §5 (setup, hype meter), §5.1, §10 and §11.
- **5 MC archetypes** (Lyricist, Battle Rapper, Storyteller, Freestyler, Hitmaker) with their own stat ranges and **5 support archetypes** (DJ, Hype Man, Producer, Vocal Coach, Manager). Each pool has 3 signature abilities plus one shared ability per role. Stats first, abilities spice (D-043).
- **Q-016 answered:** `hypeBonus` and `HYPE_STEP` are gone. A few crowd abilities take their value from the hype (`⌊H / N⌋`), a `hype` effect gains hype or rarely drains it, and a `beforeBattle` trigger lets Hometown Crowd start a battle above 0. There is no threshold trigger (D-044).
- New ability-model pieces: the `hype`, `gold` and `xp` effects; `friend` subjects for `takeFront` and `hurt`; new targets; `oncePerBattle` (Clapback can't ping-pong). The Manager's Negotiator brings gold back, small and capped; upkeep now runs income → abilities → cap. `upkeep` is used by 3 abilities, and Vocal Coach has real abilities (D-045).
- **Youth premium:** rating +⌊seasons left / 2⌋ (D-046). **Stage names:** an optional prefix + a punny word from shared and per-archetype lists, unique per league, with no real artists (D-047).
- T-012, T-013, T-016 and T-018 were reworded, and T-052 moved into Now. The paper playtest (T-051) should look at Drop the Beat stacking on every bar and at Studio Session speeding up second abilities.
- **Next:** T-050 (presentation).

## 2026-09-28 (T-048, design session 5: shop and progression)
- Ran design session 5 with the user over four rounds of questions. The user turned the shop into a **sports-manager transfer market**. Rewrote `docs/game-design.md` §4 (now "the player market"), §2 unit state, §3, §5.1, §6, §8 (now archetypes and an ability pool) and §9–§10, and updated CLAUDE.md (concept and the network rule).
- **Unique units** generated from archetypes, in **one league-wide public list** fed by rookies each upkeep and by released free agents (D-039). This answers Q-017: progression comes from value-based prices and growth.
- **Sealed bidding rounds** (up to 3 per shop phase): the highest bid wins and plays this round, and ties go to the lower-ranked crew. **Scouting** costs 1 gold for 2 private units at their ask, which vanish if unsigned. No freeze (D-040). The host resolves the bids, which widens D-031 again.
- **No merging or levels.** +1 xp per battle played; every 3 xp is +1 stat (MC) or +1 ability power (support); a random second ability at 12 xp. No youth boost (D-041).
- **Value-based ask and salary**, renegotiated at each season end; releasing and retiring pay nothing; `STARTING_GOLD = 25` (D-042). All formulas are placeholders for T-049 and T-031.
- T-011 to T-013, T-016 to T-019, T-021, T-036, T-049 and T-053 were reworded, and the M4 exit criteria were updated. Not checked yet: whether 3 bidding rounds make sittings too slow. The paper playtest (T-051) should look at that.
- **Next:** T-049 (archetypes and abilities).

## 2026-09-28 (T-047, design session 4: crew management)
- Ran design session 4 with the user over four rounds of questions. Rewrote `docs/game-design.md` §6 and §5.1 (salary; the old §5.1 stamina section is gone) and updated §1–§4, §7–§11.
- **Stamina is cut** (D-036), which changes the user's own Q-005 answer: no tiredness, no bench recovery, no `restoreStamina` effect. The bench is storage at half salary and grows to 3 slots. Vocal Coach gets a placeholder `battleStart` warm-up; no unit uses `upkeep` until T-049.
- **No unit tiers anywhere** (D-037): the shop draws from the whole roster, and salary is a per-unit base salary plus level (the old tiers are placeholder salaries). `SHOP_SLOTS = 5` is a placeholder; progression without tiers is the new Q-017 for T-048.
- **Age in years, one season = one year** (D-038): the signing age is seeded between 18 and the retirement age − 1, weighted towards young. MCs retire at 23 and support units at 25 (known, global), after a one-season farewell tour; retirement and ageing run at the season end. Retirees go into a crew hall of fame. Age affects nothing else. The user first picked a hidden seeded window, then went with this instead.
- New Q-018 (divisions of different sizes have different season lengths, but the season end is league-wide), for T-051/T-052. T-011, T-016, T-018, T-048 and T-049 were reworded, and the M4 exit criteria in `roadmap.md` now leave out stamina and tiers.
- **Next:** T-048 (shop and progression).

## 2026-09-28 (T-046, design session 3: the battle)
- Ran design session 3 with the user over three rounds of questions and rewrote `docs/game-design.md` §5 (setup, turns, hype meter, end, pacing). §8 to §10 were updated to match.
- The front MCs now **take turns** in strict alternation, with a seeded opener and no compensation (D-033); D-022 is superseded. `MAX_TURNS = 40` replaces `MAX_EXCHANGES`. Playback targets 30 to 60 s, with a 2× speed button and no skip. Stage positions stay ability conditions only.
- **Hype meter** per crew (0 to 10) from bars, disses and chokes. Each ability scales by its own `hypeBonus` per 5 hype (D-034). The roster gets a placeholder hype bonus column. "Hype damage" is renamed to "damage".
- **No draws** (D-035): the first crew wiped out loses, and at the turn limit the crew that lost more confidence loses. One battle per match, and `POINTS_DRAW` is removed. The user first wanted several battles per match, then changed their mind.
- New Q-016 (hype effects and triggers, and `battleStart` abilities always seeing 0 hype), for T-049. T-013, T-014, T-015, T-022 and T-049 were reworded.
- **Next:** T-047 (crew management).

## 2026-09-28 (T-045, design session 2: core loop, persistence and league)
- Ran design session 2 with the user over four rounds of questions. Rewrote `docs/game-design.md` §7 and updated §1, §3, §6, §10 and §11.
- **One league per friend group** (a football-style pyramid of divisions) and **one crew per player**. Seasons are a **double round robin** that spans sittings. The Q-011 defaults are confirmed (D-029). Divisions are kept even with auto-added bots, so there are no byes and `POINTS_BYE` is removed. Rep seeding is gone.
- **AI managers** are part of the game: persistent greedy filler bots, and full stand-ins for absent players. A newcomer can take over a bot's slot mid-season (D-030).
- The **league state** (including every crew) is the save, copied to all members after each round. Any member can host. A host drop voids the round. Friends are trusted: schema validation only (D-031). There's **no timer by default**, plus nudges and an optional host timer that locks the current lineup (D-032).
- Q-008, Q-011, Q-012, Q-013 and Q-014 are answered. There's a new Q-015 (forked league saves, for M6). T-019, T-028, T-034, T-035 and T-036 were reworded to match, and T-053 was added (timer and nudge). CLAUDE.md now describes the league and the network rule. The M4–M6 exit criteria in `roadmap.md` still say "session league / crew save / vs bot"; T-052 updates them.
- **Next:** T-046 (the battle).

## 2026-09-28 (T-044, design session 1: vision and pillars)
- Ran design session 1 with the user over three rounds of questions. Added a **Pillars** section at the top of `docs/game-design.md`. The fantasy is the label boss, the tone is affectionate comedy, and the players are 2–6 colleagues in breaks, with no target session length. The pillars are crew attachment, clever combos, and watchable, funny battles. The game is skill-led with some luck, and the shop has no timer. Non-goals: not a rhythm game, no real rappers or lyrics, not a grindy F2P game (D-026).
- "Let it snowball": catch-up gold is removed from §3, §7 and the tunables, while ageing, retirement and divisions stay (D-027). Owned units get a `stageName` and a `record` (D-028), and T-011 is updated to match.
- New question Q-014 (slow or absent players with no shop timer), for T-045. `make check` passes.
- **Next:** T-045 (core loop, persistence and league).

## 2026-09-28 (new milestone M2: design iteration)
- The user asked for a milestone that works through the design together with them, from the broad view to the details. Added **M2: Design iteration with the user** (method and exit criteria in `roadmap.md`) with nine tasks: T-044 to T-050 are design sessions (vision → loop and league → battle → crew management → shop → roster → presentation), T-051 is a paper playtest and T-052 a wrap-up.
- Renumbered the later milestones: the old M2–M7 are now M3–M8 (D-025). **Log entries below this one use the old numbers.** T-043 (confirm Q-011) is folded into T-045.
- M2 is **in progress**; M3 (battle sim) is **not started** again.
- **Next:** T-044 (vision and pillars). The design sessions are conversations, so run them with `/next-task` one at a time.

## 2026-09-28 (T-009, M1 finished)
- Added the starting roster to `docs/game-design.md` §8: 11 units (7 MCs and 4 support units across 3 tiers) with base stats and L1/L2/L3 ability values. Added the ability model in §9: 7 trigger types, a position condition, 3 effects, the targets, and a rule that keeps the ability queue finite (D-024). Every trigger and both position conditions are used by at least one unit.
- Made "stage position" precise: it is the locked-in slot and doesn't change when MCs move up.
- `make check` passes (30 tests).
- **M1 is done.** Every exit criterion is met by `docs/game-design.md` (§3 round structure, §5 battle, §2 positions, §5.1 stamina, §5.2 salary, §6 age and retirement, §3–§4 economy, §7 league, §8 roster, all numbers named tunables). Q-011 (league defaults) still needs the user's confirmation (T-043, before T-034). **M2 is now in progress.**
- `/milestone M1` ran T-008 and T-009 without committing.
- **Next:** T-010 (seeded PRNG), T-011 (core types), T-012 (data tables).

## 2026-09-28 (T-008)
- Wrote `docs/game-design.md`: crew and unit state, round flow (upkeep → shop → lock-in → battle → result), shop and merging, the front-MC clash battle (simultaneous exchanges, trigger order, FIFO ability queue, exchange limit), stamina and bench rest, salary, age and retirement, the league, and a tunables table. Every number is a named tunable.
- Decisions D-020 (persistent wallet, payroll at lock-in), D-021 (stamina model), D-022 (battle resolution order) and D-023 (retirement age by tier).
- Q-011: the league defaults are proposed in §7 and need the user's confirmation (follow-up T-043, before T-034). `make check` passes (30 tests).
- **Next:** T-009 (starting roster and trigger types).

## 2026-09-28 (T-042)
- The repo is public, so I checked CI through the GitHub REST API with `curl` (no `gh` needed). CI run #1 (51c5172) and run #2 (a4881ac) both passed: in the `check` job, `make install`, `make check` and `make build` passed; in the `e2e` job, the Chromium install and `make test-e2e` passed. `make check` passes locally (30 tests).
- **M0 is done.** Every exit criterion is met.
- **Next:** T-008 (M1 design doc), then T-009 (roster).

## 2026-09-28 (T-038)
- The user rebuilt the container. Chromium 1243 is in `/opt/ms-playwright` and `PLAYWRIGHT_BROWSERS_PATH` is set. `make test-e2e` passes (the smoke test sees the Phaser canvas and no console errors), and `make check` passes (30 tests).
- All M0 exit criteria are now met. M0 stays **in progress** only until T-042 (confirm CI is green).
- `origin/master` already has 51c5172, so the M0 commits are pushed. I could not check the CI result, because `gh` is not in the container.
- **Next:** T-042 (the user checks the Actions tab), then T-008 (M1 design doc).

## 2026-09-28 (M0 run wrap-up)
- `/milestone M0 --commit` worked through T-004, T-038, T-005, T-039, T-040, T-006 and T-007.
- Exit criteria: `make check`, `make dev` and `make build` work, and `core/`'s `clamp()` has passing tests. **Not met yet:** `make test-e2e`, and seeing the Phaser scene draw in a browser (the smoke test covers it). Both wait for the container rebuild (T-038).
- M0 stays **in progress**. Open: T-038 (the user runs `make dev-rebuild`, then `make test-e2e`) and T-042 (push, and confirm CI is green). After that, M0 can be closed.
- **Next:** T-038 and T-042 (user actions), then T-008 (M1 design doc).

## 2026-09-28 (T-007)
- Added `.github/workflows/ci.yml` (D-019). The `check` job runs `make install`, `make check` and `make build`; the `e2e` job installs Chromium and runs `make test-e2e`, and uploads the Playwright results when it fails. Node 20, npm cache, actions v7 (the latest releases).
- Verified locally: the YAML parses, and a fresh clone passes `make install`, `make check` (30 tests) and `make build`. The workflow itself has not run yet, because nothing has been pushed. Follow-up T-042: push, and confirm CI is green.
- **Next:** milestone wrap-up.

## 2026-09-28 (T-006)
- Rewrote `.gitignore`: removed the leftovers from another project (`public/` comments, `deploy.log`) and the duplicate entries, grouped the rest, and added `coverage/`, `test-results/`, `playwright-report/`, `blob-report/`, `.vscode/` and `*.log`. `.devcontainer/` stays ignored (D-015, D-018); T-041 asks whether `.devcontainer/project/` should be committed. `git status --ignored` shows only the expected paths.
- **Next:** T-007 (CI).

## 2026-09-28 (T-040)
- Added `tsconfig.core.json` (only the ES2022 lib, no `types`) as a third project reference, so `tsc -b` also checks `src/core/` without DOM or Node types. A probe file that used `HTMLElement` and `KeyboardEvent` failed with TS2304, as intended. Vitest's types work without DOM, so the core tests still type-check. Recorded in D-017.
- `make check` and `make build` pass.
- **Next:** T-006 (`.gitignore`), T-007 (CI).

## 2026-09-28 (T-039)
- Added `tooling/eslint-boundaries.test.ts`: it lints 25 snippets through the ESLint Node API as if they lived in `src/{core,net,render,app}` and checks which boundary rule fires (20 forbidden cases, 5 allowed ones). Type-aware rules are switched off for the snippets, because they are not real files.
- `tooling/` is covered by `tsconfig.node.json` and by the Vitest `include`. Mutation check: removing `Date` from the core globals and `render` from the net layer rule made exactly those 3 cases fail.
- `make check` passes (30 tests).
- **Next:** T-040 (core tsconfig without DOM), T-006 (`.gitignore`).

## 2026-09-28 (T-005)
- Added the project targets `install`, `dev`, `check`, `test`, `test-e2e`, `build` and `format` to the existing `Makefile`. Each one calls the matching npm script. The devcontainer targets are unchanged, `make help` lists both groups, and no names clash with the included `dev-*.mk` files.
- Filled in the Commands section of CLAUDE.md and added the Chromium and clock-skew notes to Environment notes.
- `make check` and `make build` pass. `make dev` serves the page and `main.ts` (HTTP 200). `make test-e2e` still needs the container rebuild from T-038.
- **Next:** T-039 (lint rule regression tests), T-040 (core tsconfig without DOM).

## 2026-09-28 (T-038, in progress)
- The user chose to bake Chromium into the image (D-018). Added a build step to `.devcontainer/project/Dockerfile.project`: it reads the pinned `@playwright/test` version from `package.json`, installs Chromium with its system libraries into `/opt/ms-playwright`, and sets `PLAYWRIGHT_BROWSERS_PATH`. I tested the version extraction in `sh`, and `make dev-custom-validate` passes. The real Docker build can't run from inside the container.
- **Waiting for the user:** run `make dev-rebuild` on the host, then `npm run test:e2e` (or `make test-e2e` after T-005) in the new container. T-038 stays `[~]` until the smoke test passes.
- **Next:** T-005 (Makefile).

## 2026-09-28 (T-004)
- Added Vitest 4 (Vitest 5 needs Node 22) and Playwright 1.63, pinned exactly (D-017). First `core/` test: `clamp()` in `src/core/math.ts`, 5 tests. Playwright smoke test `e2e/smoke.spec.ts` loads the page and checks that the Phaser canvas is visible and that no errors are logged. `playwright.config.ts` starts `npm run dev`.
- Split the tsconfig into project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for configs and `e2e/`, and a shared `tsconfig.base.json`). `typecheck` is now `tsc -b`. New npm scripts: `test`, `test:watch`, `test:e2e`; `check` now runs the unit tests too.
- `npm run check` and `npm run build` pass. `npm run test:e2e` fails as expected, because Chromium can't be downloaded yet. T-038 verifies it after the container rebuild.
- **Next:** T-038 (bake Chromium into the image), then T-005 (Makefile).

## 2026-09-28 (tooling)
- Added the `/milestone [M#] [--commit]` skill (`.claude/skills/milestone/SKILL.md`). It works through all open tasks of one milestone in a single run, reusing the per-task steps from `/next-task`. Tasks marked "Optional" are always included. No task ID; `tasks.md` is unchanged.

## 2026-09-28 (T-003)
- Added ESLint 10 + typescript-eslint 8 (strict and stylistic, type-checked), Prettier 3 and eslint-config-prettier (D-016). New files: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`. New npm scripts: `lint`, `lint:fix`, `format`, `format:check`, `check` (typecheck + lint + format; T-005 will make `make check` call it).
- Boundary rules for each layer in `eslint.config.js`. I checked them with throwaway probe files: all 13 planted violations were reported (Phaser/render/app imports in core, `Math.random`, `Date`, `document`, `setTimeout`, `globalThis`, render↔net cross-imports, peerjs in render, phaser in net), and `../core` imports stayed allowed.
- Prettier reformatted one long line in `render/BootScene.ts`. `npm run check` and `npm run build` pass.
- Follow-ups: T-039 (automated regression test for the boundary rules, once Vitest exists) and T-040 (a core-only tsconfig without the DOM lib, because the lint rule does not block DOM *types*).
- **Next:** T-004 (Vitest + Playwright). Playwright still needs T-038.

## 2026-09-28 (T-002)
- Scaffolded Vite 8 + TypeScript 5.9 (strict plus extra flags) + Phaser 3.90 (D-014). Layout: `src/{core,net,render,app}`; `app/main.ts` starts Phaser with a `render/BootScene` that draws a stage, a spotlight and a mic from shapes, and shows `core`'s `GAME_TITLE`.
- `tsc --noEmit` and `npm run build` pass. The dev server serves the page and modules (HTTP 200). I set the chunk warning limit to 1500 kB because Phaser alone is about 1.2 MB.
- Added `node_modules/` and `dist/` to `.gitignore`; the rest of the cleanup stays in T-006.
- **Problem:** there is no browser in the container, and the firewall blocks `npx playwright install chromium`, so I couldn't confirm the scene visually. Added T-038, which T-004 needs.
- `npm run build` on the macOS host failed: no `@rolldown/binding-darwin-arm64`, because `node_modules` was installed from the Linux container. Fixed with a container-only `node_modules` volume (D-015). This needs a container rebuild, and `.devcontainer/` is gitignored, so the change is local only.
- **Next:** T-003 (ESLint/Prettier and the boundary rule).

## 2026-09-28 (T-001)
- Question session with the user. Q-001 to Q-007 answered and recorded as D-007 to D-013.
- **Big change:** the game is a **rap battle crew manager**, not a sports manager. The crew is 3 MCs + 2 support + a bench; front MCs clash (with more battle styles possible later); stage positions and stamina matter; crews persist and have salary, age and retirement; a session league among friends has divisions with promotion.
- Rewrote the tasks, roadmap (M1 in progress; M2, M3 and M5 rescoped) and CLAUDE.md for the new concept. Added T-034 to T-037 and the new open questions Q-011 to Q-013.
- **Next:** the M0 scaffold (T-002 to T-004). After that, T-008 writes the design doc.

## 2026-09-28
- Chose the tech stack (D-001 to D-006) and wrote the CLAUDE.md, roadmap and task backlog.
- No code yet.
- **Next:** the user answers the blocking questions Q-001 to Q-006 (T-001). The M0 scaffold (T-002, T-003) can start at the same time.
- Note: `.gitignore` still has entries from another project (T-006).
