# Decisions

Newest at the bottom. Format: ID, date, decision, reason. Replaced decisions stay here
and are marked "superseded by D-###".

- **D-001 (2026-09-28): Runs in the browser, written in TypeScript (strict), built with Vite.**
  Static hosting (itch.io or Pages), instant reloads, and WebRTC is built in. Strict types
  are the main safety net for AI-written code.
- **D-002 (2026-09-28): Phaser 3 for rendering.** Scenes, tweens, input and `Graphics`
  shape drawing come built in, and AI models know it well. PixiJS was the leaner
  alternative, but it would mean building tweens and scene management ourselves.
- **D-003 (2026-09-28): P2P through PeerJS (WebRTC data channels).** Players connect with
  a room code and there is no game server. Godot and Unity were rejected because they are
  editor-centric and harder for an AI to write and verify.
- **D-004 (2026-09-28): Deterministic lockstep at phase boundaries.** Peers only exchange
  lineups, seeds and lock-ins. Both run the same pure `simulateMatch()`, and a result hash
  detects desyncs. No real-time sync, so latency doesn't matter.
- **D-005 (2026-09-28): Strict layering, with `core/` pure (no Phaser, DOM, network or
  ambient randomness).** This lets the rules be tested thoroughly without a screen and
  keeps the AI-written code from getting tangled. A lint rule enforces it.
- **D-006 (2026-09-28): Vitest + Playwright + ESLint + Prettier, combined in `make check`.**
  This gives the AI one objective pass/fail command to run after every change.
- **D-007 (2026-09-28): The game is a rap battle crew manager, not a sports manager (Q-003).**
  Players manage a crew of rappers and support members and battle other crews; Super Auto
  Pets still drives the shop and battle loop. Naming in code follows the theme: `UnitDef`,
  `Crew`, `simulateBattle(crewA, crewB, seed) → BattleEvent[]` (was `simulateMatch`/`MatchEvent`).
- **D-008 (2026-09-28): Desktop browser only (Q-002).** Mouse input, fixed landscape layout.
  Touch support is out of scope.
- **D-009 (2026-09-28): Crew = 3 MC slots + 2 support slots + a small bench (Q-005, Q-007).**
  MCs battle; support units (DJ, hype man, producer…) never take hits but buff or trigger.
  The bench holds units that are resting. The bench size is tunable.
- **D-010 (2026-09-28): First battle style is "front MCs clash" (Q-004).** The front MCs
  trade bars that deal hype damage to confidence; an MC at 0 confidence leaves the stage;
  the last crew with an MC standing wins. `simulateBattle` goes through a `BattleStyle`
  interface (style ID → pure resolver) so other styles can be added later without
  special cases.
- **D-011 (2026-09-28, stamina part superseded by D-036): Meta layer = stage positions + stamina / voice fatigue (Q-005).**
  Abilities can care about slot position (e.g. opener, closer). Performing costs stamina,
  which carries over between battles and recovers on the bench.
- **D-012 (2026-09-28): Persistent crews with salary, age and retirement (Q-005, Q-006).**
  The crew carries over between battles and sessions and is saved in the player's browser
  (localStorage). Every unit costs a salary each round and ages; old units retire. This is
  what limits power creep, since the game has no end.
- **D-013 (2026-09-28): Session league among friends with divisions and promotion (Q-006).**
  One peer hosts the league (star topology over PeerJS, still no game server, so D-003
  holds). The host keeps standings, makes 1v1 pairings each round and runs promotion and
  relegation. Each battle still uses deterministic lockstep (D-004). The league's rules
  (standings, pairing, promotion) are pure `core/` functions.
- **D-014 (2026-09-28): Pinned toolchain versions: TypeScript ~5.9, Vite 8, Phaser 3.90.**
  TypeScript 7 (the native port) is the newest release, but typescript-eslint only
  supports `<6.1`, and T-003 needs it, so we stay on 5.9. Phaser 4 is out, but D-002 chose
  Phaser 3 because AI models know it well, so we pin `^3.90`. Vite 8 needs Node ≥ 20.19,
  which the container has (20.20). The tsconfig adds strict extras
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, unused checks).
- **D-015 (2026-09-28): `node_modules` in the dev container is its own Docker volume.**
  The workspace is bind-mounted from a macOS host, and Vite 8's bundler (rolldown) ships
  per-platform native bindings, so one shared `node_modules` breaks either the host or the
  container. `.devcontainer/project/devcontainer-overrides.json` mounts
  `rap-battle-node-modules-${devcontainerId}` at `/workspace/node_modules`; the project
  `post-create.sh` chowns it and runs `npm ci`. The host keeps its own install in the real folder.
- **D-016 (2026-09-28): Lint and format setup: ESLint 10 flat config + typescript-eslint
  `strictTypeChecked` and `stylisticTypeChecked`, Prettier 3 (single quotes, width 100,
  trailing commas), `eslint-config-prettier` so they never disagree.** Layer boundaries
  use ESLint's built-in `no-restricted-imports` / `no-restricted-globals` /
  `no-restricted-properties` per folder, not `eslint-plugin-boundaries` or
  `eslint-plugin-import`: no extra plugin to keep compatible with ESLint 10, and the
  messages can name the rule they enforce. `core/` may not import Phaser, PeerJS or the
  other layers, and may not use `Math.random`, `Date`, timers, `globalThis` or DOM/browser
  globals. `net/` and `render/` may not import each other or `app/`. Plain `.js` files
  (only `eslint.config.js`) skip typed rules because they are not in the tsconfig.
- **D-017 (2026-09-28): Vitest 4 and Playwright 1.63 (pinned exactly); TypeScript split into
  project references.** Vitest 5 needs Node ≥ 22 and the container has Node 20, so we use
  `vitest@^4.1`. `@playwright/test` is pinned to an exact version because its browser build must
  match the one baked into the dev container (T-038). Unit tests sit next to the code as
  `src/**/*.test.ts`; browser tests live in `e2e/` and run against the Vite dev server.
  `tsconfig.json` is now a solution file: `tsconfig.app.json` covers `src/` (DOM lib, no Node
  types) and `tsconfig.node.json` covers the config files and `e2e/` (Node types, no DOM), both
  extending `tsconfig.base.json`. `npm run typecheck` is `tsc -b`, so `process` and other Node
  globals stay out of `src/`. `tsconfig.core.json` (T-040) checks `src/core/` a second
  time with only the ES2022 lib, so DOM and Node *types* are rejected there too.
- **D-018 (2026-09-28): Chromium for Playwright is baked into the dev container image (T-038).**
  The user's choice over allowlisting the Playwright CDN or running e2e only on the host.
  `.devcontainer/project/Dockerfile.project` reads the exact `@playwright/test` version from
  `package.json`, runs `playwright install --with-deps chromium` as root while the build still
  has network access, and sets `PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright`. Like D-015 this
  is local only, because `.devcontainer/` is gitignored. Changing the Playwright version means
  rebuilding the container.
- **D-019 (2026-09-28): CI is a GitHub Actions workflow, not a pre-commit hook (T-007).**
  The repo is on GitHub, and a hook would need an extra tool (husky) or a per-clone setup
  step. `.github/workflows/ci.yml` runs `make install`, `make check` and `make build` in one
  job, and `make test-e2e` in a second job that downloads Chromium itself (CI has open
  network access). Node 20 matches the dev container.
- **D-020 (2026-09-28, selling part superseded by D-042): Economy: a persistent wallet, with the payroll due at lock-in (T-008).**
  Gold carries over between rounds (capped at `WALLET_CAP`) instead of resetting each round
  as in Super Auto Pets, because crews persist (D-012). Salaries are paid at lock-in, not
  at upkeep, and lock-in needs `wallet >= payroll`, so a player can never go into debt or
  lose units without warning. Selling always makes the payroll affordable. Benched units cost
  half their salary (rounded down), so resting a unit is cheaper than fielding it. Details
  and numbers are in `docs/game-design.md` §3–§5.
- **D-021 (2026-09-28, superseded by D-036): Stamina is spent per battle by role and recovered only on the bench;
  tired is a single threshold (T-008).** On stage costs 1 stamina, being front MC costs 1
  more and choking 1 more. Supports pay 1, and a benched unit recovers 3. At or below the
  threshold an MC gets −1 flow and −1 confidence, and a support's abilities don't trigger.
  The alternatives, a sliding penalty per stamina point or natural recovery for everyone,
  were harder to read and weakened the reason to use the bench.
- **D-022 (2026-09-28, superseded by D-033 and D-035): Simultaneous exchanges, a seeded "first crew" and one FIFO ability
  queue (T-008).** Both front MCs hit at the same time (a draw is possible). When abilities
  of both crews trigger together, a per-battle seeded coin flip decides which crew goes
  first; within a crew the order is by slot. This is simpler to reason about and to test than
  Super Auto Pets' attack-based ordering, and it is still deterministic. Battles end in a draw
  after `MAX_EXCHANGES`, so they always terminate.
- **D-023 (2026-09-28, superseded by D-037 and D-038): Retirement age depends on tier: higher tiers retire sooner (T-008).**
  Age counts league rounds in the crew; the default retirement ages are 20/16/12 for tiers 1–3.
  Together with salary this is the power-creep limit from D-012: strong units cost more
  and stay for less time. Merging keeps the target's age, so it can't reset the clock.
  Retiring pays out like a sale.
- **D-024 (2026-09-28, amended by D-039 and D-041: `buy` is now `sign`, and a unit can learn a second ability; extended by D-045: 8 triggers, 5 effects including `gold`): Ability model: one ability per unit, built from 7 trigger types, 3
  effects and a fixed list of targets (T-009).** Triggers: `battleStart`, `takeFront`,
  `barLanded`, `hurt`, `choke` (with subject `self`/`friend`), `buy`, `upkeep`. Effects: `buff`,
  `diss`, `restoreStamina`. Buffs in battle last for that battle; in the shop and at upkeep they are
  permanent (as in Super Auto Pets). Position conditions check the locked-in slot. No ability may
  re-trigger itself without an exchange, so the ability queue always runs empty. The starting
  roster has 11 units (7 MCs, 4 support) that together use every trigger and both position
  conditions (`docs/game-design.md` §8–§9). A separate `sell` trigger and a `gainGold` effect were
  left out: no v0 unit needs them, and gold abilities fight the salary soft cap (D-020).
- **D-025 (2026-09-28): A design iteration milestone with the user comes before the core
  implementation; later milestones move up by one number.** The user asked to work through the design
  together, from the broad view to the details. M3 (was M2) implements exactly these rules, so
  the design is settled first rather than rebuilt later. The new milestone is M2; the old
  M2–M7 are now M3–M8 in `roadmap.md` and `tasks.md`. Log entries written before this date use
  the old numbers. The sessions run from broad to detailed: vision, loop and league, battle, crew
  management, shop, roster, presentation, then a paper playtest and a wrap-up.
- **D-026 (2026-09-28): Pillars: label-boss fantasy, affectionate comedy, and three pillars
  (crew attachment, clever combos, watchable funny battles) (T-044).** The user's choices in
  design session 1. Players are 2–6 colleagues playing short sessions in breaks, with no
  target session length, so every point between two rounds must be a clean place to stop.
  The game is skill-led with some luck, and the shop has **no timer**. Non-goals: not a rhythm
  game, no real rappers or lyrics, not a grindy F2P game. "Bragging rights" and "not edgy"
  were offered but not picked. The full text is in the Pillars section of `docs/game-design.md`.
- **D-027 (2026-09-28): Crews may snowball: no catch-up gold, but ageing, retirement and divisions
  stay (T-044).** The user chose "let it snowball" over soft catch-up or a hard power cap,
  and then chose to keep ageing and drop catch-up. `DIVISION_INCOME_BONUS` is removed
  from the §7 proposal and from the tunables. Retirement (D-012, D-023) stays as the thing that keeps
  lineups changing, and divisions keep strong and weak crews mostly apart.
- **D-028 (2026-09-28, amended by D-039: the stage name is rolled when a unit is generated): Owned units have a generated stage name and a career record, but
  no bio (T-044).** This serves the crew-attachment pillar. `stageName` is rolled from the seeded
  RNG at buy time; `record` tracks battles, bars landed, chokes and wins. The user picked
  "name + record" over "name + record + bio" and over type names only (the Super Auto Pets way).
- **D-029 (2026-09-28): One league per friend group, one crew per player; seasons span sittings;
  the §7 league defaults are confirmed (T-045, Q-011).** The user wants "one league system, like
  real football leagues": a pyramid of divisions (up to 6 members each, 1 up / 1 down, 3/1/0
  points). Each player owns exactly one crew for good, and it belongs to that one league. A
  season is a **double round robin** (6 rounds with 4 members, 10 with 6) that spans several
  sittings, and any round boundary is a clean stop. The alternatives were a season per sitting
  (short, no saved season state) and an endless ladder with no seasons; a global league was
  rejected because it needs a server (D-003). Divisions always have an even count (auto-added
  bots), so there are no byes and `POINTS_BYE` is removed. Rep-based seeding is gone, because
  the pyramid itself persists. Extends D-013.
- **D-030 (2026-09-28): AI managers are part of the game: persistent filler bots, and full
  stand-ins for absent players (T-045, Q-008).** One simple greedy AI manager (T-019) plays the
  real economy. Bots are persistent crews in the league: the host picks how many, one is added
  automatically for odd divisions, and a newcomer can take over a bot's slot mid-season (keeping
  the slot's points). An absent player's crew is managed fully (shop, salary, ageing), and the
  player takes it back as it is. The user chose this over playing a frozen lineup and over
  stateless or preset bots.
- **D-031 (2026-09-28): The league state (including every crew) is the save, copied to every
  member after each round; any member can host; friends are trusted (T-045, Q-012, Q-013).**
  The newest completed round wins when a sitting starts. If the host drops mid-round, the round
  is voided and anyone re-hosts from the last completed round. Shop seeds are derived from the
  league seed, the round and the crew, so a replayed round offers the same shops. Saves and
  messages are validated only by their zod schema, with no legality check. Host-only saves and a
  host legality check were the alternatives. This widens D-004: besides lineups, seeds and
  lock-ins, the host now also sends the league state snapshot, but still never battle state.
- **D-032 (2026-09-28): No shop timer by default; nudges; an optional host timer that locks the
  current lineup (T-045, Q-014).** A round's battles start once every crew has locked in. Anyone
  can nudge a player who is still shopping. The host can turn on `SHOP_TIMER_SECONDS = 120` for
  a sitting; when it runs out, the current lineup is locked in, and if the payroll isn't affordable
  units are sold cheapest first. A player who disconnects mid-round is treated the same way. The user
  chose "lock current lineup" over having the AI manager finish the shop.
- **D-033 (2026-09-28): MCs take turns: strict alternation, a seeded opener and no compensation
  (T-046).** Like in a real rap battle, one front MC drops a bar per turn and the crews alternate
  for the whole battle. The user chose this over simultaneous hits (D-022) and over multi-bar verses, because
  each hit gets its own on-screen beat (pillar 3). A seeded coin flip picks the opening crew,
  which also resolves first when both crews' abilities trigger together. The user explicitly
  wants no rule that makes up for the opener's edge "for now". `MAX_EXCHANGES = 30` becomes
  `MAX_TURNS = 40`. Stage positions stay ability conditions only, with no built-in slot bonuses.
  Playback targets 30 to 60 s at normal speed, with a 2× speed button and no skip.
- **D-034 (2026-09-28, ability scaling superseded by D-044): A hype meter per crew, and every ability scales with it on its own terms
  (T-046).** The crowd is a mechanic, not only decoration. Each crew fills its own meter (0 to 10)
  from bars, disses and enemy chokes, and loses hype when its own MC chokes. Each ability has its
  own `hypeBonus`, added per full `HYPE_STEP = 5` hype. The alternatives were a single tug-of-war
  meter, threshold triggers, a global "+1 at 5 hype" rule, and hype as a spendable currency. The user
  wanted the effect to be per ability. Because "hype damage" would clash with the meter, bar and diss
  damage is now just "damage". Hype-adding effects and hype triggers are open (Q-016, T-049).
- **D-035 (2026-09-28): Every battle has a winner, and a league match is one battle, so the table
  has no draws (T-046).** The first crew with no MC left loses. Effects resolve one at a time, so
  someone is always out first. At the turn limit, the crew that lost more confidence loses; if equal,
  the crew that lost confidence first loses; if neither lost any, the coin flip's loser. The user
  first considered several battles per match (which would allow drawn matches), then settled on
  one battle. `POINTS_DRAW` is removed, and points are now win 3, loss 0 (this changes the 3/1/0 in D-029).
- **D-036 (2026-09-28): Stamina is cut; the bench is storage with 3 slots at half salary
  (T-047).** The user chose to drop stamina, tiredness and bench recovery entirely rather than
  tune them lighter, keep the heavy rotation, or cost stamina only on chokes, because they risked being a chore.
  This changes the user's own Q-005 answer. The bench stays as cheap storage for counter-picks
  and merges in progress, and grows from 2 to `BENCH_SIZE = 3` (chosen over 4, over pausing age
  on the bench, and over no bench). The `restoreStamina` effect is removed, and Vocal Coach gets a
  placeholder `battleStart` warm-up (+X confidence to the front MC) until T-049. No unit uses
  the `upkeep` trigger for now. Supersedes D-021 and the stamina part of D-011; D-009's bench
  is no longer "for resting".
- **D-037 (2026-09-28, salary part superseded by D-042): Units have no tiers; each unit def has its own base salary (T-047).**
  The user said "there are no tiers", and confirmed it applies to the whole game: no tier
  unlocks in the shop (every slot draws from the whole roster), no tier-based salary and no
  tier-based retirement. Salary is the unit's base salary plus `SALARY_PER_LEVEL` per level
  (chosen over level-only salary), and it stays the soft cap on crew power (confirmed over
  veteran raises, a flat small salary, or no salary). The roster's base salaries are the old
  tiers (1/2/3) as placeholders. What replaces tiers as shop progression is Q-017 (T-048);
  `SHOP_SLOTS = 5` is a placeholder until then.
- **D-038 (2026-09-28): Age is in years, one season is one year; the retirement age is known
  and depends on the role; one farewell season; a hall of fame (T-047).** A unit's signing age
  is rolled from 18 to its retirement age − 1, weighted linearly towards young. MCs retire at
  23, support units at 25, so an MC lasts 1 to 5 seasons (about 3.7) and support 1 to 7 (about 5).
  A unit in its last season is on a "farewell tour" for that season; at the season end it
  retires and the next farewell tours are announced. Age affects nothing else (chosen over
  veterans with bonus stats or a higher salary). Retirees go into the crew's hall of fame,
  with no gameplay effect (chosen over a mentor gift or payout only). The user first picked a
  hidden seeded retirement window, then settled on a known global age by role with a seeded
  signing age instead. Supersedes D-023.
- **D-039 (2026-09-28): A league-wide player market of unique units generated from archetypes
  (T-048).** The user wants the shop to work "a lot more like a sport manager where you buy unique
  players", not like Super Auto Pets. Every unit is an individual generated from an archetype (a
  role, stat ranges and an ability pool) with its own stats, ability, age and stage name. The
  whole league shares one public list of free agents. Rookies enter it each upkeep, released
  units return to it, retired units leave, and the list is capped. The user chose this over
  per-crew shops of unique individuals and over one of each archetype per crew. The old 11 fixed
  units become an ability pool for two placeholder archetypes (MC, Support) until T-049.
  Supersedes the Super Auto Pets shop from T-008 (shop slots, flat buy cost) and answers Q-017:
  progression comes from value-based prices and from units growing, not from unlocks.
- **D-040 (2026-09-28): Contested signings go through sealed bidding rounds; scouting is
  personal (T-048).** The shop phase has up to `BID_ROUNDS = 3` rounds of simultaneous sealed
  bids (at least the ask) on the public list. The highest bid wins and the unit plays in this
  round's battle; ties go to the crew ranked lower, then to a coin flip. The user picked this over
  first-come-first-served (which would reward fast clicking and break "no timer") and over a
  draft order. Rolling became **scouting**: 1 gold for 2 units only you see, signed at their ask,
  which vanish at lock-in if unsigned (chosen over keeping them in the pool, or making them public).
  There is no freeze. The host collects the bids and resolves them with a pure `core/` function.
  This widens D-031 again: bids and bid results now travel over the network too.
- **D-041 (2026-09-28): No merging or levels; units grow by playing and learn a random second
  ability (T-048).** +1 xp per battle in an active slot, win or lose (chosen over play plus win,
  and over performance-based xp). Every 3 xp is a growth step: +1 flow or confidence for an MC,
  +1 power (up to 3) on an ability for a support unit. At 12 xp a unit learns a random second
  ability from its archetype's pool (chosen over a visible "potential" and over a choice of
  two). The user first wanted growth by both experience and age, then dropped the youth boost,
  so age still only decides retirement (D-038).
- **D-042 (2026-09-28, amended by D-046: the rating has a youth premium): Value-based ask and salary; salaries are renegotiated each season;
  releasing and retiring pay nothing (T-048).** A unit's rating (stats plus ability power) sets its
  ask (the minimum bid) and its salary, with placeholder formulas in `docs/game-design.md` §4 and
  §5.1. Salary is fixed at signing and recomputed at each season end, so a unit that grew costs
  more next season (chosen over a salary that rises at once and over a salary fixed for life).
  Releasing is free with no refund (chosen over 1 gold or half the ask), and retirement pays
  nothing either. Gold is meant to feel tight. `STARTING_GOLD` goes up to 25 so a new crew can
  sign a first lineup.
- **D-043 (2026-09-28): Five MC and five support archetypes, each with signature abilities plus
  one shared ability per role; stats first, abilities spice (T-049).** MC archetypes: Lyricist,
  Battle Rapper, Storyteller, Freestyler and Hitmaker, each with its own stat ranges. Support
  archetypes: DJ, Hype Man, Producer, Vocal Coach and Manager. Each pool holds 3 signature
  abilities plus Clapback (MC) or Shout-out (support), 32 abilities in all. The user chose about
  5 + 4 archetypes over 3 + 3 and 8 + 6, then added the Manager as a fifth support. They chose
  "mostly own, a few shared" over strictly own pools and over one big pool per role, and they
  chose "stats first, abilities spice" over abilities carrying the game and over an even split.
  The old 11 abilities are kept in the pools (Beatboxer became Beatmaker, DJ Turntablist Drop the
  Beat, Rookie Spitter Feature Verse). Vocal Coach gets real abilities (Breathe!, Voice Lessons),
  and `upkeep` is used by Studio Session, Voice Lessons and Negotiator. All numbers are
  placeholders for T-031. Replaces the placeholder archetypes from D-039.
- **D-044 (2026-09-28): Hype changes abilities only through crowd abilities whose value is taken
  from the hype; no global step and no threshold trigger; hype can be gained, and drained on
  rare occasions (T-049, Q-016).** `hypeBonus` and `HYPE_STEP` are removed. Most abilities ignore
  the crowd. A few crowd abilities have the value `⌊H / N⌋` (plus a number per power). A new
  `hype` effect adds hype to the ability's own crew or drains the enemy's. Only two abilities
  drain (chosen over drain as a common effect and over no drain). A `beforeBattle` trigger lets
  the Manager's Hometown Crowd start the battle above 0, so `battleStart` crowd abilities can
  see hype. The user first picked a hype-threshold trigger as well, then said "there is no
  global hype threshold, only abilities should be able to scale with hype". The alternatives were
  a per-ability hype rate for every ability, and keeping `hypeBonus` next to the crowd abilities.
  Supersedes the ability scaling in D-034; the hype meter itself stays.
- **D-045 (2026-09-28): The ability model gets 3 more effects, a `beforeBattle` trigger, `friend`
  subjects for `takeFront` and `hurt`, new targets and a `oncePerBattle` condition (T-049).**
  The effects `hype`, `gold` and `xp` trigger nothing, so they can't start chains. An ability that
  answers `hurt` with a `diss` must be `oncePerBattle`, so two Clapbacks can't ping-pong. `gold`
  is allowed again, which D-024 left out: the user chose a Manager with crowd abilities plus
  **one** light money ability (Negotiator: +1/1/2 gold at upkeep, still under the wallet cap)
  over crowd-only and over an economy-focused Manager. To make the cap apply, upkeep now runs
  income, then `upkeep` abilities, then the wallet cap. The next MC now moves up as soon as
  an MC chokes, before the queued `choke` abilities resolve.
- **D-046 (2026-09-28): The rating has a youth premium of +1 per 2 seasons left (T-049).** Like in
  a sports manager, young units ask for more and earn more: `⌊(retirement age − age) / 2⌋`, so at most +2 for an
  MC and +3 for a support unit. The premium shrinks at each season-end renegotiation. The user
  chose this over no age term (the recommendation), over +1 per season left (max +3) and over a
  strong +2 per season. A per-archetype value offset was not chosen.
- **D-047 (2026-09-28): Stage names are an optional prefix plus a punny word, flavoured by
  archetype, and unique within a league (T-049).** Shared and per-archetype prefix and word
  lists are in `docs/game-design.md` §8; the prefix chance is `NAME_PREFIX_CHANCE = 0.6`. The
  user wanted the broad pun style, not office in-jokes, and chose one or two parts over adding
  suffixes and over plain adjective + noun names. Taken names are rolled again, then numbered
  (*Biscuit II*). Words that would make a real artist's name with a prefix are left out.
- **D-048 (2026-09-29): The game is called Mic Drop League (T-050).** The user chose it over
  *Label Boss*, *Bars & Benches* and over picking the title later. The repo keeps the working
  name `rap-battle`.
- **D-049 (2026-09-29): 90s block party look with chunky paper-cut figures whose looks are
  fully random; the archetype shows as an icon badge; careers show as bling and grey hair
  (T-050).** The user chose the block party look (daytime street, brick wall, bright primary
  colours) over a neon club night (the recommendation), cartoon pastels and a retro print look.
  They chose paper-cut figures over bean blobs, cards and doodles. A unit's appearance is rolled
  from a new `look` seed on `Unit` and has no link to its archetype (chosen over "archetype
  prop plus seeded details", the recommendation, and over colour coding by archetype). The
  outfit takes the crew's colours. So the archetype shows as an icon badge next to the name
  plate (chosen over a text label and over hover only). Each growth step adds bling, the
  farewell season adds grey hair and a sash, and retirees get a framed hall-of-fame portrait
  (chosen over badges only and over a look that never changes). The design resolution is
  1280 × 720 scaled to fit; the lettering is bold outlined text with no font files.
- **D-050 (2026-09-29): A home hub with tabs, a side-view battle stage, a scouting-table
  market, templated battle one-liners and a headline result screen (T-050).** The hub (Market,
  Lineup, League, Hall of Fame and a Lock in button) was chosen over linear step screens and
  over one busy screen. The side-view face-off was chosen over a front view and a close-up duel.
  The market is a sortable sports-manager table with a detail panel (chosen over a card grid,
  the recommendation, and over a toggle between both). Battle text is comic words and numbers
  on every hit plus templated one-liners on chokes, abilities and big swings (chosen over
  words only and over a line for every bar). The result screen has a tabloid headline, an MVP,
  xp and gold, the other results and the standings (chosen over a plain summary and over
  going straight to the standings). Text templates are seeded from the battle seed, so both
  peers see the same lines.
- **D-051 (2026-09-29): Sound is in scope: one procedural beat that builds with hype, plus
  SFX, on by default at low volume (T-050, Q-010).** All WebAudio, no files, built in M7
  (T-030). One seeded beat per battle adds layers as total hype rises and drops out on a
  choke (chosen over a beat per crew that swaps each turn and over a fixed loop). Beat plus SFX
  was chosen over SFX only and over cutting sound. Sound starts on at 40% volume with mute
  always visible (chosen over muted by default and over asking on first start).
- **D-052 (2026-09-29): A crew has a typed name, two colours and a shape logo; bots get
  generated ones (T-050).** Chosen over a name plus one colour and over generated identities
  only. The name is at most `CREW_NAME_MAX = 20` characters and unique in the league. Bot names
  are *The ⟨adjective⟩ ⟨noun⟩* from lists in `docs/game-design.md` §2. The identity is part of
  `Crew` and the league state, so `core/` holds it; `render/` only draws it.
- **D-053 (2026-09-29): More income instead of cheaper salaries: `BASE_INCOME = 16`,
  `STARTING_GOLD = 40` (T-051).** The paper playtest showed that 25 starting gold couldn't sign
  a first lineup once the first payroll is due, and that a full crew of 5 (payroll about 13)
  could never be paid from 10 income. The user chose to raise income over rounding salaries
  down (with income 12 and a start of 35), and over leaving it to T-031. The salary formula is unchanged.
- **D-054 (2026-09-29): Battles are short and punchy: a target of 6 to 12 turns (T-051).** The
  playtest saw 3 to 8 turns, because flow ≈ confidence, and MCs often choked in setup before
  dropping a bar. The user accepted short battles with about 4 to 6 s of screen time per turn
  over tripling confidence (with the rating counting confidence / 3), and over leaving it to
  T-031. The 30 to 60 s playback target stays.
- **D-055 (2026-09-29): Abilities queued before their MC choked still resolve (T-051).** The
  user chose this over removing them from the queue (the recommendation), so every trigger that
  showed on screen pays off. A choked MC still triggers nothing new except its own `choke`.
  Positional targets use the place it held when it choked, and a buff on the choked MC does nothing.
- **D-056 (2026-09-29): A retiring unit enters the hall of fame of every crew it played for
  (T-051).** This includes units that retire from the public list after being released. The user chose
  it over only the crew it played the most battles for (the recommendation), and over only the crew it
  retires from. The `record` keeps battles and seasons per crew.
- **D-057 (2026-09-29): Bots pad every division to the same even size (T-051, Q-018).** At
  league creation and at each season start, every division is filled up to the size of the largest one,
  rounded up to even, so all divisions play the same number of rounds and reach the league-wide
  season end together. Chosen over extra round robin rounds for the smaller divisions, and over
  letting them sit out.
- **D-058 (2026-09-29): A bigger start pool, with roles drawn 3 : 2 (T-051).**
  `POOL_START_PER_MEMBER` goes from 4 to 6, and every generated unit (start pool, rookies,
  scouts) draws its role with `MC_WEIGHT : SUPPORT_WEIGHT = 3 : 2` before its archetype. In the
  playtest, 8 units for 10 slots ran out in the first bidding round. Chosen over 6 per member
  with 50/50 roles, and over keeping the scarcity. `POOL_MAX` is now checked at upkeep only, so the
  start pool may exceed it.
- **D-059 (2026-09-29): Rule clarifications from the paper playtest (T-051).** These fill gaps
  the doc left open, each with one sensible reading:
  - Rookies enter once per league round, and none in the first round.
  - A won unit goes into the first free active slot of its role, else the bench.
  - Open bids must stay valid while the crew scouts, signs or arranges.
  - A released unit keeps its xp and `look`.
  - A diss gives hype once per ability, and a diss of 0 triggers nothing.
  - After a bar the queue order is `barLanded`, `hurt`/`choke`, `takeFront`, with targets picked at resolution.
  - When a back MC chokes, the MCs behind it close up.
  - `takeFront` fires once per time an MC becomes the front MC.
  - The MVP counts confidence actually lost.
  - Every season round is played.

  The full list is in `docs/playtest-1.md`.
