# Roadmap

Milestones are ordered so that there is **always something playable as early as possible**.
Multiplayer comes after single-player on purpose: a deterministic core makes P2P a thin
layer on top.

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation & tooling | done |
| M1 | Game design v0 | done |
| M2 | Design iteration with the user | in progress |
| M3 | Core: battle simulation | not started |
| M4 | Core: shop, crew upkeep & league | not started |
| M5 | Playable single-player (vs. bot) | not started |
| M6 | Peer-to-peer multiplayer | not started |
| M7 | Juice & polish | not started |
| M8 | Release & playtest | not started |

---

## M0: Foundation & tooling
**Goal:** an empty but strict project where the AI gets fast pass/fail feedback.
**Exit criteria:** `make check`, `make dev`, `make build` and `make test-e2e` all work.
A Phaser scene draws a shape in the browser, and a pure `core/` function has a passing test.

## M1: Game design v0
**Goal:** answer the blocking questions in `open-questions.md` and write the rules down.
**Exit criteria:** `docs/game-design.md` exists and covers the round structure, match
resolution (front-MC clash), stage positions, stamina, salary, age and retirement, economy,
the division league, and a starting roster of about 10 crew units (MCs and support) with
stats and abilities. Every number in it is marked as tunable.

## M2: Design iteration with the user
**Goal:** work through the design with the user, from the broad view down to the details,
until `docs/game-design.md` describes the game they want to build. M1 wrote the first draft
on its own; this milestone makes it the user's design.
**Method:** each task is one design session, held in this order: vision → core loop and
league → battle → crew management → shop and progression → roster and abilities →
presentation → paper playtest → wrap-up. A session:
1. sums up the current state of its topic from `docs/game-design.md`, briefly;
2. asks the user open questions first (what should this feel like?), then concrete choices
   with a recommended default, over several `AskUserQuestion` rounds until the user is happy;
3. writes every answer into `docs/game-design.md`, adds a `D-###` entry for each choice
   made, and moves answered `Q-###` items to "Answered";
4. adds new questions for later sessions to `open-questions.md` instead of guessing.
A later session may reopen an earlier answer if the user wants to. The broad sessions come
first so the detailed ones build on settled ground.
**Exit criteria:** every M2 session is done and recorded. `docs/game-design.md` has a
pillars section and matches every answer. The open design questions Q-008, Q-010, Q-011,
Q-012 and Q-013 are answered. A paper playtest of at least 3 rounds with the user found no
rule the doc leaves undefined. The tasks of M3 and later match the new design.

## M3: Core: battle simulation
**Goal:** `simulateBattle(crewA, crewB, seed) → BattleEvent[]`, pure and deterministic.
**Exit criteria:** seeded RNG, crew and unit data model, ability trigger system, and the
"front MCs clash" battle style behind a `BattleStyle` interface are in place. Tests cover
each ability, check that the same seed always gives the same event log, and include a
property test that every battle ends.

## M4: Core: shop, crew upkeep & league
**Goal:** the complete rules of an endless league, without any UI.
**Exit criteria:** shop rolls (tiered by round), buy/sell/reorder/bench/merge/level-up, gold
income, salaries, stamina and bench rest, ageing and retirement, league divisions with
standings, pairing and promotion/relegation, and a versioned crew save format. A headless
test can play several league seasons between bots.

## M5: Playable single-player
**Goal:** a person can play league rounds in the browser against a bot or ghost crew.
**Exit criteria:** Phaser shop scene (drag to buy/reorder, sell, roll, freeze), match
scene that plays back the event log with tweens, result and standings screens, and
procedural shape art for every crew unit. A Playwright smoke test clicks through one round.

## M6: Peer-to-peer multiplayer
**Goal:** a group of friends plays a session league using a room code.
**Exit criteria:** PeerJS lobby (host creates a code, guests join), the host runs the league
(pairings, standings, divisions), zod-validated message protocol with a version handshake,
shared seed agreement, simultaneous lock-in, and a result-hash check that detects desyncs.
Disconnects are handled and the player gets feedback. A Playwright test plays a league
round with three or more tabs.

## M7: Juice & polish
**Goal:** make it feel good. Only features that fit the remaining jam time.
**Exit criteria (pick by priority):** hit and ability effects, screen shake, procedural
sound via WebAudio, a tutorial or onboarding hint, a colour palette and theme pass,
balance tuning using headless bot-vs-bot statistics.

## M8: Release & playtest
**Goal:** a submitted, playable build.
**Exit criteria:** static build deployed (itch.io or GitHub Pages), the jam page text
written, a real P2P game tested between two different networks, known issues listed.
