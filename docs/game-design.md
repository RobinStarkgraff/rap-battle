# Game design v0

> **Status: draft.** M1 wrote this draft. In M2 it is reviewed with the user one topic at a
> time (T-044 to T-052), so any section may still change.

The rules of the game, written from the answered questions and decisions D-007 to D-013.
M3 and M4 build `core/` from this document. If the code and this document disagree, fix one
of them in the same change.

> **Every number here is a tunable default.** Numbers are written as `NAME = value`, and the
> same names are collected in [Tunables](#10-tunables). In `core/` they become one typed
> constants table, so balancing (T-031) only edits data. Unit stats and ability values in
> the [roster](#8-starting-roster) are tunable in the same way.

## Pillars

Settled with the user in T-044 (D-026). Every rule in this document should serve at least one
pillar and break none of the non-goals. Later design sessions check their answers against this section.

**Fantasy: you are the label boss.** You don't rap. You scout talent in the shop, set the
lineup, pay the salaries, and then watch your crew go to war on stage.

**Tone: affectionate comedy.** Over the top and funny, but it loves hip-hop: punny stage
names, silly disses, big egos. It's never mean about the culture it borrows from.

**Players: 2 to 6 colleagues** who play short sessions in breaks, online at the same time,
over weeks. A session has **no target length**: players stop whenever they like, so every
point between two rounds must be a clean place to stop and come back to later.

### The three pillars

1. **Attachment to your crew.** Units are *yours*: each one has a generated stage name
   and a battle record that grows over its career (see [Unit state](#unit-state)). Crews
   persist and grow over weeks, so it should sting a little when a veteran retires.
2. **Clever combos.** Most of the fun is in finding synergies between units, positions
   and triggers in the shop, and seeing them go off in battle. Abilities should create
   choices, not just add raw stats.
3. **Watchable, funny battles.** The battle playback should be worth watching, not
   skipping: every exchange, choke and ability should read clearly on screen and land
   with a joke.

### Design principles

- **Skill-led, with some luck.** As in Super Auto Pets, the shop rolls are random and the
  battle follows from the lineups plus a shared seed. The better manager wins most of the time, and upsets
  still happen.
- **No timer.** The shop has no clock. Players take as long as they want to think.
- **Investment snowballs.** Building a strong crew over many rounds is meant to pay
  off, and there's no catch-up gold for losing crews. Two things still move crews
  along: **ageing and retirement** (D-012), so no lineup lasts forever, and **divisions**, so
  weak and strong crews mostly meet their equals.

### Non-goals

- **Not a rhythm game.** Players don't act during the battle. You win it in the shop, then watch.
- **No real rappers, songs or lyrics.** Every character, name and line is invented.
- **Not a grindy free-to-play game.** No monetization, energy timers, daily chores or
  login rewards.

## 1. Overview

Each player manages a **rap crew**: 3 MCs who battle on stage, 2 support members who buff
and trigger, and a small bench for resting. A league round has a **shop phase**, where the
player buys, sells and arranges the crew, and an **automatic battle** against another
player's crew. The crew **persists**. It keeps its members, their stamina, age and levels,
and its gold between rounds and sessions. Members cost a salary, get tired and eventually
retire, so crews keep changing and power can't pile up forever.

## 2. Crew

| Area | Slots | Role |
|---|---|---|
| Stage (MC slots) | 3: **Opener** (slot 1, front), **Middle** (slot 2), **Closer** (slot 3) | MCs battle here, front first |
| Support slots | 2 | Support units trigger abilities and never take hype damage |
| Bench | `BENCH_SIZE = 2` | Resting units. They take no part in the battle and recover stamina |

- MC slots only take MCs and support slots only take support units. The bench takes both.
- **Stage positions** are the slot an MC holds in the locked-in lineup. Abilities that
  mention *Opener*, *Middle* or *Closer* check that starting slot, and it doesn't change
  when MCs move up. *Front MC* always means
  the MC currently at the front during the battle.
- An empty MC slot is skipped: the next MC behind it moves up at battle start.

### Unit state

A unit definition (`UnitDef`) is fixed data: name, role (`mc` or `support`), tier, base
stats and ability. An owned unit (`UnitInstance`) adds persistent state:

| Field | Meaning |
|---|---|
| `flow` | MCs only. Hype damage dealt per bar |
| `confidence` | MCs only. Hype damage an MC can take before choking |
| `level`, `xp` | From merging duplicates (see [Shop](#4-shop-phase)) |
| `stamina` | 0 to `MAX_STAMINA = 10`. New units arrive at `MAX_STAMINA` |
| `age` | League rounds this unit has spent in the crew. New units arrive at 0 |
| `stageName` | A generated stage name, rolled from the seeded RNG when the unit is bought and kept for its whole career. The name lists are content (T-049) |
| `record` | Career stats: battles played, bars landed, chokes, wins with the crew. Shown on the unit and in its retirement farewell |

Buffs that happen **in battle** last until the end of that battle. Buffs that happen in the
**shop or upkeep** are permanent.

## 3. Round flow

One league round runs these phases in order (the `app/` state machine in T-023):

1. **Upkeep** (automatic)
   1. Every unit's `age` goes up by 1. Units that reach their tier's retirement age retire
      (see [Age and retirement](#6-age-and-retirement)).
   2. Income: `BASE_INCOME = 10` gold, plus `WIN_BONUS = 2` if the crew won its last battle.
      There is no catch-up income for losing crews (see [Pillars](#pillars)). The wallet is
      then capped at `WALLET_CAP = 20`, and anything above is lost.
   3. `upkeep` abilities trigger.
   4. A new shop is rolled. Frozen shop slots stay.
2. **Shop**: buy, sell, roll, freeze, merge, reorder and bench, in any order. The UI always
   shows the **payroll** that is due at lock-in.
3. **Lock-in**: the payroll (see [Salary](#52-salary)) is paid from the wallet. Lock-in
   is only possible while `wallet >= payroll`. Selling always makes that reachable, because
   it adds gold and lowers the payroll. The locked crew is a snapshot that is sent to the
   opponent (D-004).
4. **Battle**: `simulateBattle(crewA, crewB, seed)` runs on both peers and the event log is
   played back.
5. **Result**: league points are awarded, then stamina is spent and recovered (see
   [Stamina](#51-stamina-and-bench-rest)).

A brand new crew has no units, `STARTING_GOLD = 10` gold and skips the first upkeep.

## 4. Shop phase

| Action | Rule |
|---|---|
| Shop size | `SHOP_SLOTS_T1 = 3` slots, `SHOP_SLOTS_T2 = 4` once tier 2 unlocks, `SHOP_SLOTS_T3 = 5` once tier 3 unlocks |
| Tier unlocks | By the crew's **career round** (league rounds played by this crew): tier 2 from round `TIER2_ROUND = 3`, tier 3 from round `TIER3_ROUND = 6`. Crews persist, so after a few rounds every tier is open for good |
| Shop draw | Each slot draws a unit def uniformly from the unlocked tiers, using the seeded RNG. If both roles are unlocked, at least one slot is an MC and one is a support unit |
| Buy | `BUY_COST = 3` gold. The unit goes to a free slot of its role or to the bench. It can't be bought if there is no room and no copy to merge with |
| Roll | `ROLL_COST = 1` gold. Rerolls every slot that isn't frozen |
| Freeze | Free. A frozen slot keeps its unit through rolls and into the next round's shop |
| Sell | Refunds `SELL_REFUND_PER_LEVEL = 1` gold per level |
| Reorder / bench | Free. Units move between MC slots, support slots (by role) and the bench |
| Merge | Buy a copy of an owned unit onto it, or drop one owned unit onto another with the same def |

### Merging and levels

- The merged unit keeps the **target's** `age` and `stamina`, so a fresh copy can't reset
  either.
- Stats: the higher `flow` and the higher `confidence` of the two, then `+MERGE_STAT_BONUS = 1` each.
- `xp` = target xp + source xp + 1. Level 2 at `XP_LEVEL2 = 2`, level 3 at `XP_LEVEL3 = 5`.
  Level 3 is the maximum, and a level-3 unit can't be merged further.
- Ability values scale by level (the roster lists L1/L2/L3 values).
- Buying onto a merge counts as a buy, so `buy` abilities trigger.

## 5. Battle: "front MCs clash"

This is the first battle style (D-010). `simulateBattle` picks the resolver through a
`BattleStyle` interface, so later styles (T-037) don't need special cases.

### Setup

1. Tired units are marked (see [Stamina](#51-stamina-and-bench-rest)).
2. A seeded coin flip picks the **first crew** for the whole battle. Whenever abilities of
   both crews trigger at the same moment, the first crew's abilities resolve first. Within a
   crew the order is MC slot 1, 2, 3, then support slot 1, 2.
3. If a crew has no MC on stage, it loses at once. If neither has one, the battle is a draw.
4. `battleStart` abilities trigger, then the front MC of each crew `takeFront`.

### Exchanges

The battle is a series of **exchanges**, repeated until it ends:

1. Both front MCs drop bars **at the same time**. Each deals hype damage equal to its `flow`
   to the other front MC's `confidence`.
2. Each MC that dealt damage triggers `barLanded`. Each MC that took damage and still has
   confidence above 0 triggers `hurt`.
3. Every MC at 0 confidence **chokes** and leaves the stage. `choke` abilities trigger.
4. For each crew whose front MC choked, the next MC moves up and triggers `takeFront`.

Abilities can deal hype damage outside exchanges as well. Chokes are checked after every
single effect, so a choke caused by an ability triggers its own `choke` abilities.
Triggered abilities go on one FIFO queue, which is processed until it is empty before the
next exchange starts.

### End

- The battle ends when at least one crew has no MC left on stage. The crew that still has
  one **wins**. If both are out at the same moment, it is a **draw**.
- The battle also ends as a draw after `MAX_EXCHANGES = 30` exchanges, so every battle
  terminates (the property test in T-015).
- **MC margin** = the winner's MCs still on stage. It is used as a league tiebreak.

All random choices (coin flip, random targets) come from the seed through the seeded RNG
(T-010). The same crews and seed always give the same `BattleEvent[]`.

### 5.1 Stamina and bench rest

Performing costs stamina, which carries over between battles (D-011).

| When | Stamina change |
|---|---|
| MC was on stage for the battle | `-STAMINA_COST_STAGE = 1` |
| … and was the front MC in at least one exchange | `-STAMINA_COST_FRONT = 1` more |
| … and choked | `-STAMINA_COST_CHOKE = 1` more |
| Support unit was in a support slot | `-STAMINA_COST_SUPPORT = 1` |
| Unit was on the bench | `+BENCH_RECOVERY = 3` |

Stamina stays within 0 and `MAX_STAMINA`. A unit is **tired** when its stamina is at or
below `TIRED_THRESHOLD = 3` at battle start:

- a tired MC performs with `-TIRED_FLOW_PENALTY = 1` flow and `-TIRED_CONFIDENCE_PENALTY = 1`
  confidence (never below 1) for that battle;
- a tired support unit's abilities don't trigger in that battle.

A front MC that chokes loses 3 stamina, so it can play about 3 battles before it is tired.
With only `BENCH_SIZE` bench slots, rotating tired units out is part of the game.

### 5.2 Salary

Every unit in the crew costs a salary at each lock-in (D-012):

- salary on stage or in a support slot = `SALARY_BY_TIER = [1, 2, 3]` for tiers 1 to 3,
  `+SALARY_PER_LEVEL = 1` per level above 1;
- salary on the bench = half of that, rounded down (`BENCH_SALARY_FACTOR = 0.5`), so a
  benched level-1 tier-1 unit is free.

With `BASE_INCOME = 10`, a crew full of high-tier, high-level units costs more than the
income. That is intended: salary is the soft cap on crew power.

## 6. Age and retirement

`age` counts league rounds in the crew, including byes and bench time. A unit retires
during upkeep when its age reaches its tier's retirement age: `RETIRE_AGE_BY_TIER =
[20, 16, 12]` for tiers 1 to 3. Stars shine brightly but briefly. For the last
`FAREWELL_ROUNDS = 2` rounds the UI shows a "farewell tour" badge; the rules don't change.

A retiring unit leaves the crew and pays out like a sale (`SELL_REFUND_PER_LEVEL` per
level), so players don't need to sell it by hand just before it retires.

## 7. League

A **session league** among friends (D-013). One peer hosts it; the rules below are pure
`core/` functions (T-034).

> **Status: proposal.** Q-011 asks for these defaults, and the user still has to confirm
> them. Until then, treat this section as the working default for M4.

| Topic | Proposed rule |
|---|---|
| Divisions | One division holds up to `DIVISION_MAX = 6` players. With more players the league splits into the fewest divisions that keep everyone at or below `DIVISION_MAX`, sized as evenly as possible. A group of 2 to 6 friends plays in one division |
| Seeding | At session start, players are sorted by **rep** (the league points their crew earned in its last season, stored in the save, 0 for a new crew), and ties are broken by a seeded coin flip. Divisions are filled from the top |
| Season | A round robin inside each division: every pair meets once. With an odd number of players, one player gets a bye each round. If that is fewer than `MIN_SEASON_ROUNDS = 3` rounds, the round robin repeats until the season reaches at least that many (2 players play a best of 3) |
| Pairing | The circle method, rotated by the season seed, so the pairings are deterministic and fair |
| Points | Win `POINTS_WIN = 3`, draw `POINTS_DRAW = 1`, loss 0, bye `POINTS_BYE = 1`. A bye still runs upkeep and ageing, and every unit counts as benched |
| Tiebreaks | Head-to-head points, then total MC margin, then a seeded coin flip |
| Promotion | With more than one division, the top `PROMOTE_COUNT = 1` of each lower division goes up and the bottom `PROMOTE_COUNT` of each higher division goes down. With one division, the winner is crowned champion (a trophy on the crew, cosmetic only) |
| Catch-up | None. Crews are meant to snowball (see [Pillars](#pillars)); divisions keep strong and weak crews apart |
| Joining and leaving | A player who joins mid-season enters the bottom division at the next season. A player who leaves forfeits their remaining battles (the opponent wins with MC margin 0). What happens if the host leaves is open (Q-013) |

## 8. Starting roster

11 units: 7 MCs and 4 support units across 3 tiers. The names are placeholders that fit the
theme, not real artists. Stats are **L1 base stats** (`flow` / `confidence`); merging adds
to them as described in [Merging](#merging-and-levels). Ability values are listed for
L1 / L2 / L3. Everything in this table is tunable.

| # | Unit | Tier | Role | Flow / Conf | Trigger | Ability | L1 / L2 / L3 |
|---|---|---|---|---|---|---|---|
| 1 | **Rookie Spitter** | 1 | MC | 2 / 3 | `buy` | Give one other random MC in the crew (stage or bench) +X confidence, permanently | 1 / 2 / 3 |
| 2 | **Battle Kid** | 1 | MC | 3 / 2 | `takeFront` | Diss the enemy front MC for X hype damage | 1 / 2 / 3 |
| 3 | **Street Poet** | 1 | MC | 1 / 4 | `choke` (self) | Pass the mic: the MC behind it gets +X flow and +X confidence | 1 / 2 / 3 |
| 4 | **Beatboxer** | 1 | Support | – | `battleStart` | The front MC gets +X flow | 1 / 2 / 3 |
| 5 | **Punchliner** | 2 | MC | 4 / 3 | `barLanded` (self) | Diss the enemy MC behind the enemy front for X | 1 / 2 / 3 |
| 6 | **Freestyler** | 2 | MC | 3 / 4 | `battleStart`, if **Closer** | Gains +X flow and +X confidence | 2 / 3 / 4 |
| 7 | **Hype Man** | 2 | Support | – | `choke` (friend) | The new front MC gets +X confidence | 2 / 4 / 6 |
| 8 | **Vocal Coach** | 2 | Support | – | `upkeep` | Every MC in the crew (stage and bench) recovers X stamina | 1 / 2 / 3 |
| 9 | **Headliner** | 3 | MC | 6 / 6 | `battleStart`, if **Opener** | Diss every enemy MC for X | 1 / 2 / 3 |
| 10 | **The OG** | 3 | MC | 5 / 7 | `hurt` (self) | Every friendly MC behind it gets +X flow | 1 / 2 / 3 |
| 11 | **DJ Turntablist** | 3 | Support | – | `barLanded` (friend) | The MC that landed the bar gets +X flow (the beat drops) | 1 / 2 / 3 |

Design notes:

- Every trigger type is used at least once, and the two position conditions (Opener,
  Closer) each have a unit, so M3 tests can cover the whole trigger system with this roster.
- Tier 1 teaches the basics (entry damage, a choke hand-off, a simple buff). Tier 2 adds
  positioning (Freestyler wants to close, Punchliner reaches past the front). Tier 3 units
  are the strongest but retire soonest (D-023).
- Vocal Coach is the only stamina tool. It trades a support slot for fewer bench rotations.

## 9. Abilities

An ability is **data**: a trigger, an optional condition, a named effect, a target and
values per level. `core/` implements each effect and target once, as a small named
function (T-013). A unit has exactly one ability in v0.

### Trigger types (7)

| Trigger | Fires when | Subject |
|---|---|---|
| `battleStart` | once, after battle setup | – |
| `takeFront` | this MC becomes the front MC, including the Opener at battle start | self |
| `barLanded` | an MC deals exchange damage (ability damage doesn't count) | `self` or `friend` (any friendly MC) |
| `hurt` | this MC takes hype damage from any source and still has confidence above 0 | self |
| `choke` | an MC reaches 0 confidence and leaves the stage | `self` or `friend` |
| `buy` | this unit is bought, including when it is bought onto a merge | – |
| `upkeep` | each upkeep, after income | – |

- Support units never take damage, so for them `barLanded` and `choke` only make sense with
  the subject `friend`.
- Benched units' abilities don't trigger, except `buy` (a unit bought straight onto the
  bench still triggers it).
- Tired support units don't trigger in battle (D-021). `buy` and `upkeep` still work.
- An MC that has choked doesn't trigger anything afterwards, except its own `choke`.

### Conditions

- `inSlot: opener | middle | closer`: the MC's starting slot (see [Crew](#2-crew)).

### Effects (3)

| Effect | What it does | In battle | In shop/upkeep |
|---|---|---|---|
| `buff` | adds flow and/or confidence to friendly MCs | until the battle ends | permanent |
| `diss` | deals hype damage to enemy MCs | can trigger `hurt` and `choke` | – |
| `restoreStamina` | adds stamina, up to `MAX_STAMINA` | – | permanent |

### Targets

- Friendly: `self`, `frontFriend`, `friendBehind` (the next MC behind this one on stage),
  `allFriendsBehind`, `triggeringFriend` (the MC that caused the trigger),
  `randomOtherCrewMC` (stage or bench), `allCrewMCs` (stage and bench).
- Enemy: `enemyFront`, `enemyBehindFront` (the second enemy MC on stage), `allEnemies`.
- If a target doesn't exist (for example, no MC behind), the effect does nothing.
  Random targets use the seeded RNG.

### Rules for new abilities

- No effect may cause its own trigger again without an exchange in between (for example, no
  `hurt` ability that deals damage to friendly MCs). Then the FIFO queue from
  [Exchanges](#exchanges) always runs empty, because each chain is bounded by the number of MCs.
- New triggers, effects or targets are added to the tables above first, then to `core/`.

A sketch of the data shape, for orientation only (T-011 and T-013 decide the real types):

```ts
const streetPoet: UnitDef = {
  id: 'street-poet',
  name: 'Street Poet',
  role: 'mc',
  tier: 1,
  flow: 1,
  confidence: 4,
  ability: {
    trigger: { kind: 'choke', subject: 'self' },
    effect: 'buff',
    target: 'friendBehind',
    values: [
      { flow: 1, confidence: 1 },
      { flow: 2, confidence: 2 },
      { flow: 3, confidence: 3 },
    ],
  },
};
```

## 10. Tunables

Every name above with its default. `core/` keeps them in one typed table.

| Name | Default | Section |
|---|---|---|
| `BENCH_SIZE` | 2 | Crew |
| `MAX_STAMINA` | 10 | Crew, Stamina |
| `STARTING_GOLD` | 10 | Round flow |
| `BASE_INCOME` | 10 | Round flow |
| `WIN_BONUS` | 2 | Round flow |
| `WALLET_CAP` | 20 | Round flow |
| `SHOP_SLOTS_T1` / `_T2` / `_T3` | 3 / 4 / 5 | Shop |
| `TIER2_ROUND` / `TIER3_ROUND` | 3 / 6 | Shop |
| `BUY_COST` | 3 | Shop |
| `ROLL_COST` | 1 | Shop |
| `SELL_REFUND_PER_LEVEL` | 1 | Shop, Retirement |
| `MERGE_STAT_BONUS` | 1 | Shop |
| `XP_LEVEL2` / `XP_LEVEL3` | 2 / 5 | Shop |
| `MAX_EXCHANGES` | 30 | Battle |
| `STAMINA_COST_STAGE` / `_FRONT` / `_CHOKE` | 1 / 1 / 1 | Stamina |
| `STAMINA_COST_SUPPORT` | 1 | Stamina |
| `BENCH_RECOVERY` | 3 | Stamina |
| `TIRED_THRESHOLD` | 3 | Stamina |
| `TIRED_FLOW_PENALTY` / `TIRED_CONFIDENCE_PENALTY` | 1 / 1 | Stamina |
| `SALARY_BY_TIER` | 1 / 2 / 3 | Salary |
| `SALARY_PER_LEVEL` | 1 | Salary |
| `BENCH_SALARY_FACTOR` | 0.5 (rounded down) | Salary |
| `RETIRE_AGE_BY_TIER` | 20 / 16 / 12 | Retirement |
| `FAREWELL_ROUNDS` | 2 | Retirement |
| `DIVISION_MAX` | 6 | League |
| `MIN_SEASON_ROUNDS` | 3 | League |
| `POINTS_WIN` / `POINTS_DRAW` / `POINTS_BYE` | 3 / 1 / 1 | League |
| `PROMOTE_COUNT` | 1 | League |

## 11. Still open

- Q-008: are bots or ghost crews part of the final game (for example to fill byes), or only a test tool?
- Q-011: confirm the league defaults in [League](#7-league).
- Q-012: does the host validate saved crews?
- Q-013: what happens when the league host disconnects?
- Q-014: with no shop timer, what happens when a player is slow or away during a league round?
