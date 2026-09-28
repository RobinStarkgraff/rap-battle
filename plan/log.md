# Session log

Newest first. Keep each entry to a few lines: what was done, what's next, any problems.

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
