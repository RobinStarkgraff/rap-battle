# Roadmap

Milestones are ordered so that there is **always something playable as early as possible**.
Multiplayer comes after single-player on purpose: a deterministic core makes P2P a thin
layer on top.

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation & tooling | done |
| M1 | Game design v0 | done |
| M2 | Design iteration with the user | done |
| M3 | Core: battle simulation | done |
| M4 | Core: shop, crew upkeep & league | in progress |
| M5 | Playable single-player (league vs. bots) | not started |
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
**Exit criteria:** seeded RNG; the crew and unit data model (`docs/game-design.md` §2); the
data tables for the 10 archetypes, the 32 abilities, the name lists and the tunables (§8,
§10); the ability system with its 8 triggers, conditions, fixed and hype-based values, 5
effects and targets (§9); and the "front MCs clash" battle style behind a `BattleStyle`
interface, with alternating turns, hype meters and the no-draw end rules (§5). Tests cover
each ability, check that the same seed always gives the same event log, and include a
property test that every battle ends with exactly one winner.

## M4: Core: shop, crew upkeep & league
**Goal:** the complete rules of an endless league, without any UI.
**Exit criteria:** the player market (unit generation with stage names, supply, scouting,
sealed bidding rounds, release), arranging slots and bench, upkeep (income, `upkeep`
abilities, wallet cap), payroll at lock-in, growth and the second ability, the season end
(titles, retirement into the halls of fame, ageing, salary renegotiation), league divisions
padded with bots, the double round robin, standings and promotion/relegation, joining and
leaving, the AI manager, one pure function that plays a whole league round, and a versioned,
zod-validated league state save. A headless test lets AI managers play several league
seasons.

## M5: Playable single-player
**Goal:** a person can play league rounds in the browser in a local league filled with bots,
and come back to it later.
**Exit criteria:** title screen, crew founding (name, colours, logo) and a new local league
with bots; the home hub with its Market (scouting table, bidding rounds, scouting), Lineup
(drag and drop, release), League and Hall of Fame tabs and the Lock in button; the battle
scene that plays back the event log with tweens and battle text; the result screen with its
headline and MVP; paper-cut figures drawn from each unit's `look` seed, and crew logos; the
league saved in the browser. A Playwright smoke test clicks through one full round.

## M6: Peer-to-peer multiplayer
**Goal:** a group of friends plays rounds of their persistent league together, using a room code.
**Exit criteria:** PeerJS lobby (any member hosts with their saved league, guests join by
code, the newest league state wins); a zod-validated message protocol with a version
handshake; the host collects and resolves the bidding rounds, runs the AI managers for bots
and absent players, and sends the league state to everyone after each round; battle seed
agreement after lock-in, and simultaneous lock-in; a result-hash check that detects desyncs;
who is still shopping, nudges and the optional shop timer; disconnects handled (a host drop
voids the round, a player drop locks the current lineup) with feedback for the player; a
"while you were away" summary. A Playwright test plays a league round with three or more tabs.

## M7: Juice & polish
**Goal:** make it feel good. Only features that fit the remaining jam time.
**Exit criteria (pick by priority):** balance tuning using headless AI-manager statistics
(battle length, economy, salary and retirement pacing), hit and ability effects, screen
shake, the procedural beat and SFX (D-051), a tutorial or onboarding hint, a colour palette
and theme pass, and a second battle style through the `BattleStyle` interface.

## M8: Release & playtest
**Goal:** a submitted, playable build.
**Exit criteria:** static build deployed (itch.io or GitHub Pages), the jam page text
written, a real P2P game tested between two different networks, known issues listed.
