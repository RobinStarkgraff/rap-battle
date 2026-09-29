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
- **D-060 (2026-09-29): Design wrap-up: `docs/game-design.md` is v1, and M2 is done (T-052).**
  A consistency pass with no new game rules, only one reading for each gap:
  - A **crew state** table in §2: `wallet`, `hallOfFame` and a crew `record` with titles (§7
    already sent titles there). The win bonus and standings come from the league's results.
  - One **season end** order for the whole league in §7 (titles, retirement, ageing, salaries,
    divisions, schedule); §3 and §6 point to it.
  - The **league seed** is rolled at league creation and stored in the league state; the season
    seed is derived from it. The **battle seed** is agreed after lock-in (T-027), so it is unknown
    while shopping, and the host stands in for AI-run crews.
  - `xp` also comes from abilities (Studio Session), and it counts like battle xp. At 12 xp the
    growth step is applied before the second ability is learned.
  - The unused `allCrewMCs` target is dropped: a target is added only with an ability that needs it.
  - The stage name retry count is the tunable `NAME_REROLLS = 10`.
  - The M3 to M7 exit criteria and tasks now describe the player market, the league with bots and
    the league state save, not the old Super Auto Pets shop. New T-055: one pure `playRound()`
    shared by the headless test, the local league and the host.
- **D-061 (2026-09-29): The seeded RNG is mulberry32; `fork(label)` and `deriveSeed()` hash the
  seed with labels (T-010).** `createRng(seed)` returns a plain object of functions (no class).
  `fork(label)` depends only on the stream's seed and the label, not on how far the stream has
  advanced, so a named sub-stream (for example the battle one-liners from the battle seed) is
  the same wherever it is forked. `deriveSeed(seed, ...labels)` mixes FNV-1a label hashes with the
  murmur3 finaliser, for the market, season and scouting seeds of §3. A test pins the first
  outputs, because changing the stream would change every saved league's rolls. Alternatives were
  xorshift128+ (needs 64-bit state or BigInt) and forks that draw from the parent (order-dependent).
- **D-062 (2026-09-29): The core data model (T-011).** The id lists (abilities, archetypes,
  triggers, targets, colours, logos) are `as const` arrays, so the types come from them and tests
  can check coverage at runtime; the data tables are `Record<Id, Def>`, so the compiler checks
  they are complete. `Unit` is a union on `role`: only an `McUnit` has `flow` and `confidence`,
  and its `archetype` is an MC archetype. `abilities` is a tuple of one or two. A crew's slots are
  tuples (`[McUnit | null ×3]`, `[SupportUnit | null ×2]`) and the bench a list of at most
  `BENCH_SIZE`. `simulateBattle` takes a `BattleLineup` (id and active slots), not a whole crew.
  An ability has one `Effect`, a union on `kind` that carries its target and `Amount`
  (`byPower` values plus an optional `hypeDivisor`); `gold` has no target, it always goes to the
  own crew. The event log names crews `'a'` and `'b'` and reports actual damage and clamped hype
  changes. Colour and logo ids live in `core/`; their hex values belong to `render/` (T-020).
- **D-063 (2026-09-29): Effects return operations; growth is built with the `xp` effect (T-013).**
  An effect function doesn't change state: it picks its targets and returns operations (`buff`,
  `damage`, `hype`, `gold`, `xp`). The battle applies them one at a time, so chokes are checked
  after every single effect (§5), and outside a battle the crew applies them for good. A diss
  returns its hits in stage order and then its one cheer (`HYPE_PER_DISS`), only if it dealt
  more than 0 to someone. `gainXp()` (growth steps, then the second ability at 12 xp) is part of
  this task because the `xp` effect applies growth at once; T-018 reuses it after battles.
  `friend` means any *other* MC of the crew (the doc said "any friendly MC"; only matters for an
  MC with a `friend` ability, which none has yet). `sign` abilities resolve at the unit's power,
  which is always 1 for the only one (Feature Verse, an MC ability). Outside a battle the view's
  "stage" is the crew's MCs in active slots, and `CrewEvent`s report what happened for the UI.
- **D-064 (2026-09-29): How the battle engine orders what happens (T-014).** One reading for
  each detail §5 leaves open, all pinned by tests in `frontMcsClash.test.ts`:
  - A bar's own hype (`HYPE_PER_BAR`) comes right after the bar, before its `barLanded` abilities.
  - On a choke: the `choke` event, the MCs close up, the choking crew loses hype, the other crew
    gains it, then (if a crew is out) the battle ends at once; otherwise the `choke` abilities are
    queued, and if it was the front MC, the new front MC's `front` event and `takeFront`.
  - A diss's hits land in stage order, each checked for a choke, and its one cheer comes after them.
  - `oncePerBattle` is used up when the ability triggers, not when it resolves.
  - A value-0 buff or diss still emits its event (it shows on screen) but triggers nothing.
  - The coin flip is the battle stream's first draw; random targets draw from the same stream.
  - The engine keeps mutable state inside `simulateBattle` only; its inputs are never changed.
  - A queue safety limit (10 000 steps) throws, because the §9 rules bound every chain, so hitting
    it would be a data bug.
- **D-065 (2026-09-29): How the player market generates and names units (T-016).** One reading
  for each detail §4 and §8 leave open:
  - Public units get the ids `u1`, `u2`, … from a counter kept in the market; scouted units get
    `<crew>/r<round>/s<scouting>/<index>`, so they are unique without a shared counter.
  - A unit's rolls come in a fixed order (role, archetype, flow, confidence, first ability, age,
    `look`, stage name), and a test pins the first units, because saved leagues depend on it.
  - Every draw outside a battle has its own labelled seed from the league seed (`core/seeds.ts`),
    so one draw never shifts another (start pool, rookies per round, each scouting).
  - Stage names are unique among **living** units (crews, public list, scouts), ignoring case;
    a retired unit's name is free again. After `NAME_REROLLS` the last roll gets the numeral.
  - A generated unit already carries the salary its value is worth, so the market can show it;
    it is set again at signing.
  - Units dropped to fit `POOL_MAX` leave the game without retiring, so no hall of fame.
- **D-066 (2026-09-29): How the shop phase resolves and refuses actions (T-017).** One reading for
  each detail §4 leaves open, all pinned by `shop.test.ts`:
  - Shop actions return a `Result` with a reason (`breaksBids`, `cannotAfford`, …) for the UI, and
    never throw for a refused action.
  - A bidding round resolves units in public-list order. A winning bid its crew can no longer
    honour (no place or gold left after earlier wins) passes to the next best bid. Crews missing
    from the ranking rank lowest; the coin flip is only drawn for a real tie.
  - Moving a unit onto an occupied place swaps the two if both roles fit. The bench has no gaps.
  - Releasing never breaks an open bid (it lowers the payroll and frees a place), so it is always
    allowed. A unit that rejoins a crew keeps its old stint in its record.
  - A scouted unit whose stage name was taken after scouting gets the numeral when it is signed.
  - `forceLockIn` (timer, disconnect) releases by what a unit costs at lock-in (bench halved) and
    keeps units that cost nothing, since releasing them wouldn't help (the doc said "lowest salary").
- **D-067 (2026-09-29): Careers across rounds and seasons (T-018).**
  - A unit's stint with its current crew counts a season at the season end, before retirement,
    so a retiree's last season counts too. A unit that joined in the last round counts it.
  - Hall of fame entries are added in retirement order (crews in league order, units in slot
    order, then free agents). A crew that no longer exists gets none.
  - After a battle, units are matched to the event log by id; a unit without a stint for its
    crew gets one (only possible for units placed without signing, as in tests).
  - Upkeep reports its income and the gold lost to the cap. Gold above the cap is lost at every
    upkeep, whatever brought it there.
  - Free agents' listed salaries are refreshed at the season end with the crews', so the market
    shows what they would cost (signing sets the salary again anyway).
- **D-068 (2026-09-29): The league state and its rules (T-034).**
  - A `League` holds the seed, members (player with a name, or bot), every crew, the market, the
    season (divisions, a schedule per division, results) and the counters. Divisions are lists of
    **schedule slots**, and results and pairings refer to slots, so a newcomer who takes over a
    bot's slot keeps its points. `lastRoundWinners` gives the win bonus, `freshCrews` skip their
    first upkeep, and `waiting` holds newcomers until the next season. Crew ids are `c1`, `c2`, …
  - Pairings shuffle the slots with the season seed, per division, then use the circle method;
    the second half swaps the sides. (The doc said "rotated"; a shuffle varies more.)
  - Head-to-head counts the games between all crews tied on points. The coin flip is a fixed key
    per crew and season from the league seed, so a table never reorders itself.
  - A newcomer takes over the lowest-placed bot of the lowest division that has one; the bot's
    units become free agents rather than vanishing.
  - At the season end promoted crews rank at the bottom of their new division and relegated
    ones at the top, then waiting newcomers; the league is split again by that ranking and each
    division is padded with new bots at its bottom. Bots are only removed by a takeover.
  - Typed crew names are trimmed. A bot's trim colour differs from its main colour.
- **D-069 (2026-09-29): A league round is a set of phase functions, and `playRound()` composes
  them (T-055).** A human shops over many clicks and the host waits for everyone, so one call
  can't take all the shop decisions up front. `startRound` returns a `RoundState`; the shop
  actions, `resolveBids`, `lockInCrew` and `finishRound` each return a new one (or a refusal).
  `playRound(league, managerFor, seeds?)` drives them with a `CrewManager` per crew (`bid` before
  each bidding round, `lineup` before lock-in), for the headless test and AI-run crews; the local
  league (T-023) and the host (T-036) call the same phases one step at a time.
  - Managers act in league order; a crew that hasn't bid when the bids are revealed passes.
  - Bid ties use the standings at the start of the round.
  - A forced lock-in works during the bidding too; the crew then passes in later rounds.
  - Battle seeds come from a callback. `localBattleSeed` (from the league seed) serves the local
    league and headless runs; M6 plugs in the agreed seeds (T-027).
  - Waiting newcomers neither pay upkeep nor play until their division starts.
- **D-070 (2026-09-29): The league save is versioned JSON checked by a zod schema in `core/save/`
  (T-035).** The schema lives in `core/` because it describes the core league state exactly, and
  both `app/` (the browser save) and `net/` (the league state the host sends, D-031) need it;
  zod is pure and deterministic, so `core/` may use it. Each schema is typed `z.ZodType<CoreType>`,
  so the compiler catches drift, and a test round-trips a league that has played a season. A
  save is `{ format: 'mic-drop-league', version, league }`; `SAVE_VERSION` is bumped with every
  shape change, together with a migration in `MIGRATIONS`, and saves from a newer version are
  refused. Only completed rounds are saved: a round is replayed from its seeds after a reload.
  `app/leagueStorage.ts` stores it in `localStorage` under one key through a small
  `KeyValueStore` interface, and reports blocked storage as a result instead of throwing.
- **D-071 (2026-09-29): The AI manager's policy (T-019).** The §7 greedy policy, made concrete
  (the details are in `docs/game-design.md` §7 AI managers):
  - **Best value** is battle strength (the rating without the youth premium) per gold of ask
    plus one salary, with a seeded ±10% taste per crew and round so bots don't all chase the
    same unit. Bids are the ask, one more 30% of the time, so ties are rarer.
  - It fills MC slots before support slots (a crew with no MC loses at once; this was a real
    failure in the headless run) and makes at most one upgrade bid per bidding round.
  - It keeps its payroll within `BASE_INCOME` and trims it itself by strength per salary,
    because the forced lock-in releases the *cheapest* units first and would strip a lineup
    down to its expensive stars.
  - **Lineup order** (the playtest's open point): confidence counts double for the Opener, flow
    for the Closer, and an `inSlot` ability adds 4 in its slot; the best of the 6 orders wins.
  - It is one `CrewManager` constant, so bots and absent players share it. Its tuning numbers
    (`UPGRADE_MARGIN`, `OVERBID_CHANCE`, `VALUE_JITTER`, `MAX_SCOUTS`, `SLOT_ABILITY_BONUS`) sit
    in `core/ai/` rather than `TUNABLES`, because they are the AI's taste, not game rules.
- **D-072 (2026-09-29): The art draws into a `Pen`, and looks are rolled with the core RNG
  (T-020).** Every art function in `render/art/` takes a `Pen`, a small structural subset of
  Phaser's `Graphics`, so unit tests draw with a recording pen in Node and check bounds, colours
  and determinism without a canvas; only `unitFigure.ts` and the scenes touch Phaser at runtime.
  `rollLook(look)` uses `createRng` from `core/` with a fixed roll order (body, skin, hair, hair
  colour, eyes, brows, mouth, accessory, outfit) and a pinned test, because saved units must keep
  their looks. Hats are hair styles (a hat hides the hair), and a figure faces right; crew B is
  mirrored. Bling follows `docs/game-design.md` §11 (`BLING_MAX = 4` pieces, then a thicker
  chain, up to 4). Crew colour hex values live in `render/palette.ts` (D-062). A development-only
  art gallery opens with `?gallery`. Chosen over drawing straight into Phaser objects (untestable
  in Node) and over pre-rendered textures (no image files).
- **D-073 (2026-09-29): Who says which battle line, and how headlines are chosen (T-054).** The
  rival front MC says a choke taunt (the choking MC says its last words if its crew has nobody on
  stage), the unit whose ability resolves says a line picked by the ability's effect kind, and
  the crowd shouts after a big hype swing (a rise or a drop). Headlines have five kinds picked
  from the end reason and margin (forfeit, decision, blowout at margin 3, close at margin 1,
  standard), are filled with the MVP, the losing crew's top MC and both crews, and fall back to
  crew-only lines when no MC dealt damage. Lines are drawn from streams derived from the battle
  seed (`battle-text`, `headline`), in event order, so every peer sees the same ones. Templates
  use `{slot}` names that a test checks against the values each table gets, so a line can never
  show a raw slot on screen.
- **D-074 (2026-09-29): Battle playback is a pure script of beats; static art is baked into
  textures (T-022).** `buildPlayback()` turns the event log into beats, each with its screen
  time, its words and lines and a snapshot of the stage after it, so the Phaser scene only
  animates and the script is unit-tested (one beat per shown event, snapshots within the rules,
  big swings, 30 to 60 s). A crew's opening front MCs already stand at the mic, so their first
  `front` event has no beat; `hype` events get a short beat of their own. Every beat has a fixed
  screen time; a battle is then sped up to fit 60 s or slowed down to reach 30 s, by at most
  1.4× (typical random battles: median about 45 s). Phaser redraws a `Graphics` object's shapes on every frame,
  which made the backdrop and a dozen figures crawl in software WebGL (about 7 fps headless), so
  backdrops, figures and crowd heads are drawn once into textures (`art/bake.ts`, at 2× for
  figures) and shown as images. Named buttons are registered in `ui/targets.ts` so browser tests
  can find them (for T-024). A development page at `?battle=<seed>` plays demo battles back to back.
- **D-075 (2026-09-29): How the local league and the game flow work (T-023).**
  - A local league is one player (named "You") plus 3, 5, 7 or 11 bots, picked when founding
    (default 5, so one division of 6). The seed comes from `Math.random` in `app/`.
  - The bots bid as soon as a bidding round opens (so their releases already show in the
    market), the player's bids reveal the round, and the bots set their lineups and lock in when
    the player does. Replaying a round after a reload gives the same bot moves.
  - The league is saved as soon as the round's battles are played, before the playback, so
    closing the tab during a battle can't lose or change the round; founding saves the new
    league at once, replacing the old save (the title screen says so).
  - The flow (`app/flow.ts`) is a plain state machine without Phaser, tested in Node; the
    director starts one Phaser scene per screen, and the hub scene subscribes to the hub's
    controller for changes within a round. The hub interface (`HubController`) is declared in
    `render/`, so `render/` never imports `app/`.
  - The hub's first tab is **Home** (the crew on the block and the round report); the header
    shows the next opponent as it stood at the round start, so shop moves stay sealed (D-004).
  - The MVP rule of §11 is `battleMvp()` in `core/battle/` (pure, from the event log); the
    headline's second MC is the losing crew's top damage dealer. Headlines never put a verb after
    a crew name, because crew names may be singular or plural.
  - `window.micDropTargets()` lists the named buttons on screen for browser tests. A container is
    clicked at its origin, because Phaser's `Container.getBounds` ignores `Graphics` children.
- **D-076 (2026-09-29): How the market and lineup tabs work (T-021).** The market collects a
  **draft** of bids that is checked with the core `bidsProblem` as each bid is added, so an
  impossible bid is refused with its reason before the player submits; **Submit bids** (or
  **Pass** with no draft) places them as the crew's sealed bids for the round. The table sorts
  by ask with the priciest first by default, shows 13 lines per page with the scouted units
  (signed at the ask with no bidding) above the public list, and filters by role and then
  archetype. Free agents wear the neutral grey outfit. In the lineup, units can be dragged, or
  picked with a click and put down with a click on a place (for mice that don't drag well and
  for browser tests); a drop onto an occupied place swaps if both roles fit (core `moveUnit`);
  any empty bench box appends to the bench, which has no gaps. Releasing needs a second click
  ("YES, RELEASE …"), because it has no refund. Each tab keeps its view state (sort, page,
  selection, draft) in the hub scene, so it survives redraws within a round.
- **D-077 (2026-09-29): Browser tests click named targets, with a fixed league seed (T-024).**
  The game is one canvas, so `e2e/` finds buttons through `window.micDropTargets()` (the named
  objects on screen, their centres and whether they are enabled) and clicks them at their
  position scaled to the canvas, waiting on targets rather than on fixed times, because the
  container's headless Chromium renders at 15 to 20 fps. A disabled button also switches its
  input off, so a test sees it as disabled. `?seed=<n>` fixes a new league's seed, so the round
  test plays the same league every run (it bids 2 over the ask, because the bots bid the ask or
  one more). The round test takes about a minute; it has a 4 minute limit. The `e2e/` tsconfig
  now includes the DOM lib for `page.evaluate` code, and failures keep a screenshot.
- **D-078 (2026-09-29): Signalling goes through the public PeerJS server, with an override
  (Q-009).** The user's choice over self-hosting. The game uses PeerJS's free server
  (`0.peerjs.com`) unless `?peer=<host>:<port>` names another one (a group's own `peer`
  server). The dev container's firewall blocks the public server, so browser tests start a
  local PeerJS server (the `peer` npm package) and point the tabs at it.
- **D-079 (2026-09-29): No fork handling: a save is a whole league, and copies of the same
  league are compared by completed round only (Q-015).** The user said there is no forking:
  every save file is its own entire league. So the lobby doesn't try to detect two sittings
  that played the same league separately. A league is known by its league seed; when a guest's
  copy of the host's league has more completed rounds, the host adopts it (D-031); on a tie, or
  when the host's is newer, the host's copy is played and sent to everyone.
- **D-080 (2026-09-29): A guest without the host's league founds a crew and joins it; a save of
  another league is replaced only after a confirmation.** The user's choice over keeping several
  leagues saved side by side. The guest founds a crew in the lobby (name, colours, logo) and the
  host adds it by the §7 newcomer rule (it takes over a bot's slot, or waits for the next
  season). One league per group (D-029) means one save per browser.
- **D-081 (2026-09-29): The transport is a small `Network`/`Link` interface with a PeerJS and an
  in-memory implementation; messages are framed strings (T-025).** `net/` hides PeerJS behind
  `Network.host(code)` / `join(code)` and ordered text `Link`s, so the league protocol is unit
  tested over `createMemoryNetwork()` without WebRTC, and only `peerNetwork.ts` touches PeerJS.
  Data channels use PeerJS's `raw` serialization and our own frames (`frames.ts`, 16 000 code
  units each), because a league snapshot can pass a browser's message limit and PeerJS's own
  chunking only covers its binary serializers. Room codes are 4 letters without I and O (about
  330 000), registered as the peer id `mic-drop-league-<code>`; a taken code is retried with a
  new one. With a local signalling server (`?peer=localhost:9000`, `make peer-server`) no STUN
  server is configured. Hosting needs a saved league, because a host plays its own league
  (D-031). Browser tests read the room code from the target name `lobby-code-<code>`.
- **D-082 (2026-09-29): The protocol is JSON messages checked by zod on arrival, starting with a
  versioned handshake (T-026).** Every message has a `type` and its own schema in
  `net/protocol.ts`; text that isn't JSON or doesn't match is dropped, never thrown (Q-012). A
  link starts with the guest's `hello` (`GAME_ID`, `PROTOCOL_VERSION` and its saved league's seed,
  completed round and crew) and the host's `welcome` (with the guest's seat) or `refused`
  (`protocolMismatch`, `sittingFull`). Each end closes a link whose other end has another protocol
  version, so no half-compatible game starts; the version is bumped with every message change once
  released. Both handshake steps time out after 10 s. A sitting takes at most 11 guests (a league of
  12 crews). Links hand out messages a microtask later and in order, so a listener that stops after
  the handshake leaves the following messages for the session's listener.
- **D-083 (2026-09-29): A round in a sitting is replicated as ordered ops; the host plays
  through its own client (T-036).** Every peer keeps its own copy of the round and applies the
  host's ops with the pure `core/` round functions (`net/ops.ts`): shop actions, `aiBid` and
  `aiLineup` (the AI manager is deterministic, so peers compute its moves themselves), `bidPlaced`,
  `reveal`, `lockIn` and `forceLockIn`; `play` then runs the battles from the seeds it names. Only
  small ops travel, never round state, and the host sends the whole league state after each round
  (D-031). A `bidPlaced` op carries the bids only to their own crew; for everyone else it counts as
  a pass until the `reveal` op lists every human crew's bids, which never makes a later valid
  action invalid on their copy. The host validates each action on its own copy and only sends
  ops it applied, and each client checks its player's actions on its copy first for an instant
  refusal. The host's own seat is a `LeagueClient` over an in-memory link, so host and guests share
  one code path. The crews with a seated player at the round start are the round's humans; the AI
  manager runs every other crew (bots and absent players) for the whole round, bidding as each
  bidding round opens and setting its lineup when the bidding ends, as in the local league (D-075).
  Guests who arrive mid-round get the round's messages so far and watch. The host adopts a newer
  copy only between rounds, newcomers found crews only between rounds, and two seats can't claim
  one crew (`crewTaken`). Copies are compared with `canonicalLeague()` (JSON with sorted keys),
  because a parsed save orders its keys by schema. A browser remembers which crew of its saved
  league it plays (`mic-drop-league/crew`), since a joined league has several player crews. Until
  T-027, battle seeds come from the league seed.
- **D-084 (2026-09-29): Battle seeds by commit–reveal, with the host standing in for AI-run
  crews (T-027).** At lock-in a player's client draws a secret 128-bit nonce
  (`crypto.getRandomValues`) and sends only its SHA-256; the host does the same for every crew it
  stands in for (bots, absent players, forced lock-ins). When every crew has locked in, the host
  asks for the nonces, checks each against its commitment and sends them all in `play`; each peer
  checks them again and derives each battle's seed with `agreedBattleSeed(leagueSeed, round,
  division, nonceA, nonceB)`. So neither crew alone can choose its battle's seed, and no seed exists
  while anyone is still shopping. A revealed nonce that doesn't match is replaced by the host (marked
  `replaced`); a client that sees a nonce the host changed reports a desync, but plays the host's
  seeds, since the host decides (friends are trusted, Q-012). SHA-256 is a small synchronous
  implementation (`net/sha256.ts`, checked against WebCrypto), so lock-in stays synchronous and
  works where `crypto.subtle` is missing (plain http on a LAN). "Simultaneous lock-in" is the
  battles starting only once every crew has locked in, with no screen showing another crew's
  changes before; the replicas do hold every crew's moves, which bid resolution needs, and that
  is fine among trusted friends.
- **D-085 (2026-09-29): Desyncs are found by a league hash and healed from the host; dropped
  players are locked in; the host's drop voids an unplayed round (T-028).** The host's `league`
  message carries the SHA-256 of its canonical league JSON. After a round, each client hashes its
  own result: a mismatch is reported (`outOfSync`, shown to everyone) and the host's league
  replaces its copy. A client whose copy can't apply an op or play the battles asks for a
  `resync`: the host sends the round from its start again, or, when the round is already over, the
  last round from its start and then the league, so the player still sees their battle. A seat
  that closes mid-round is force-locked (`forceLockIn`, the host standing in for its nonce), or
  its nonce is replaced if it had locked in already, and everyone gets a `playerLeft` notice. A
  client saves the round as soon as its battles are played, so when the host drops after that, the
  round counts for everyone who saw it (the newest copy wins at the next sitting); before that,
  the round is void and the lobby says so. PeerJS links send a heartbeat every 5 s and close after
  45 s of silence, because a data channel can take long to notice a lost network; the timeout is
  long because a hidden tab's timers may run rarely. A tab that closes or reloads leaves the
  sitting on `pagehide`, so the others know within seconds.
- **D-086 (2026-09-29): Who is shopping, nudges and the shop timer (T-053).** Every peer derives
  each human crew's status from its copy of the round (a sealed bid shows as "bids in" without its
  amounts), so no extra messages are needed; the hub shows it as a strip with NUDGE buttons, and the
  lobby shows it to players who watch. A nudge goes through the host, which drops repeats from one
  crew to another within 10 s; the sound comes with the SFX (T-030). The host toggles the timer in
  the lobby between off and `SHOP_TIMER_SECONDS`; it runs on the host only, which sends the time
  *left* (the peers' clocks differ) each time it starts a bidding round's or the lineup's timer,
  and to late arrivals. When a bidding round's time runs out, every human crew that hasn't bid
  passes (a sealed empty bid), and when the lineup's runs out, the rest are force-locked with the
  host standing in for their nonces. Turning the timer on mid-round starts it at once.
- **D-087 (2026-09-29): The multiplayer browser test runs its own signalling server (T-029).**
  `playwright.config.ts` starts `npx peerjs --port 9000` next to the dev server, locally and on CI
  (D-078), and launches Chromium with `--disable-features=WebRtcHideLocalIpsWithMdns`, because
  Chromium's mDNS host names can't be resolved between its own tabs in a container or on CI. Each
  player is its own browser context, so each has its own saved league. The test reads the room
  code from the target name `lobby-code-<code>` and compares the three saved leagues. In a
  sitting, the market hides its submit button once the player's bids are in, because a second
  PASS would replace them; the test relies on that to pass only where a player still has to bid.

