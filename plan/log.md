# Session log

Newest first. Keep each entry to a few lines: what was done, what's next, any problems.

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
