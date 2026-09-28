# Roadmap

Milestones are ordered so that there is **always something playable as early as possible**.
Multiplayer comes after single-player on purpose: a deterministic core makes P2P a thin
layer on top.

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation & tooling | not started |
| M1 | Game design v0 | in progress |
| M2 | Core: battle simulation | not started |
| M3 | Core: shop, crew upkeep & league | not started |
| M4 | Playable single-player (vs. bot) | not started |
| M5 | Peer-to-peer multiplayer | not started |
| M6 | Juice & polish | not started |
| M7 | Release & playtest | not started |

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

## M2: Core: battle simulation
**Goal:** `simulateBattle(crewA, crewB, seed) → BattleEvent[]`, pure and deterministic.
**Exit criteria:** seeded RNG, crew and unit data model, ability trigger system, and the
"front MCs clash" battle style behind a `BattleStyle` interface are in place. Tests cover
each ability, check that the same seed always gives the same event log, and include a
property test that every battle ends.

## M3: Core: shop, crew upkeep & league
**Goal:** the complete rules of an endless league, without any UI.
**Exit criteria:** shop rolls (tiered by round), buy/sell/reorder/bench/merge/level-up, gold
income, salaries, stamina and bench rest, ageing and retirement, league divisions with
standings, pairing and promotion/relegation, and a versioned crew save format. A headless
test can play several league seasons between bots.

## M4: Playable single-player
**Goal:** a person can play league rounds in the browser against a bot or ghost crew.
**Exit criteria:** Phaser shop scene (drag to buy/reorder, sell, roll, freeze), match
scene that plays back the event log with tweens, result and standings screens, and
procedural shape art for every crew unit. A Playwright smoke test clicks through one round.

## M5: Peer-to-peer multiplayer
**Goal:** a group of friends plays a session league using a room code.
**Exit criteria:** PeerJS lobby (host creates a code, guests join), the host runs the league
(pairings, standings, divisions), zod-validated message protocol with a version handshake,
shared seed agreement, simultaneous lock-in, and a result-hash check that detects desyncs.
Disconnects are handled and the player gets feedback. A Playwright test plays a league
round with three or more tabs.

## M6: Juice & polish
**Goal:** make it feel good. Only features that fit the remaining jam time.
**Exit criteria (pick by priority):** hit and ability effects, screen shake, procedural
sound via WebAudio, a tutorial or onboarding hint, a colour palette and theme pass,
balance tuning using headless bot-vs-bot statistics.

## M7: Release & playtest
**Goal:** a submitted, playable build.
**Exit criteria:** static build deployed (itch.io or GitHub Pages), the jam page text
written, a real P2P game tested between two different networks, known issues listed.
