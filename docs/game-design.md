# Game design v0: Mic Drop League

> **Status: v1, settled with the user.** M1 wrote the first draft; M2 reviewed it with the
> user one topic at a time (T-044 to T-050), checked it in a paper playtest (T-051) and made
> it consistent (T-052). The rules change from here only through a decision in
> `plan/decisions.md`, and the balance numbers through the balance pass (T-031).

The rules of the game, written from the answered questions in `plan/open-questions.md` and
the decisions in `plan/decisions.md` (D-007 onwards). M3 and M4 build `core/` from this
document. If the code and this document disagree, fix one of them in the same change.

> **Every number here is a tunable default.** Numbers are written as `NAME = value`, and the
> same names are collected in [Tunables](#10-tunables). In `core/` they become one typed
> constants table, so balancing (T-031) only edits data. Stat ranges and ability values in
> the [archetypes and abilities](#8-starting-archetypes-and-abilities) are tunable in the same way.

## Pillars

Settled with the user in T-044 (D-026). Every rule in this document should serve at least one
pillar and break none of the non-goals. Later design sessions check their answers against this section.

**Fantasy: you are the label boss.** You don't rap. You scout and sign talent in the player market, set the
lineup, pay the salaries, and then watch your crew go to war on stage.

**Tone: affectionate comedy.** Over the top and funny, but it loves hip-hop: punny stage
names, silly disses, big egos. It's never mean about the culture it borrows from.

**Players: 2 to 6 colleagues** who play short sessions in breaks, online at the same time,
over weeks. A sitting has **no target length**: players stop whenever they like, so every
point between two rounds must be a clean place to stop and come back to later.

### The three pillars

1. **Attachment to your crew.** Units are *yours*: each one has a generated stage name
   and a battle record that grows over its career (see [Unit state](#unit-state)). Crews
   persist and grow over weeks, so it should sting a little when a veteran retires.
2. **Clever combos.** Most of the fun is in finding synergies between units, positions
   and triggers in the shop phase, and seeing them go off in battle. Abilities should create
   choices, not just add raw stats.
3. **Watchable, funny battles.** The battle playback should be worth watching, not
   skipping: every bar, choke and ability should read clearly on screen and land
   with a joke.

### Design principles

- **Skill-led, with some luck.** The rookies, scouted units and growth rolls are random, and
  the battle follows from the lineups plus a shared seed. The better manager wins most of the
  time, and upsets still happen.
- **No timer by default.** The shop has no clock. Players take as long as they want to think;
  only the host can turn on an optional timer (see [Slow players](#slow-players-and-the-optional-timer)).
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
and trigger, and a bench for units that sit a battle out. A league round has a **shop phase**, where the
player signs, releases and arranges units from a shared player market, and an **automatic battle** against another
player's crew. The crew **persists**. It keeps its members, their age and growth,
and its gold between rounds and sittings. Members cost a salary, get a year older every
season and retire at a known age, so crews keep changing and power can't pile up forever.

Each player owns **exactly one crew**, and it plays in the friend group's **one league**: a
pyramid of divisions with promotion and relegation, like a football league system. Seasons
run over many short sittings. AI players fill the league up and stand in for absent members
(see [League](#7-league)).

## 2. Crew

| Area | Slots | Role |
|---|---|---|
| Stage (MC slots) | 3: **Opener** (slot 1, front), **Middle** (slot 2), **Closer** (slot 3) | MCs battle here, front first |
| Support slots | 2 | Support units trigger abilities and never take damage |
| Bench | `BENCH_SIZE = 3` | Storage at half salary: counter-picks, prospects, units waiting for a slot. Benched units take no part in the battle |

- MC slots only take MCs and support slots only take support units. The bench takes both.
- **Stage positions** are the slot an MC holds in the locked-in lineup. Abilities that
  mention *Opener*, *Middle* or *Closer* check that starting slot, and it doesn't change
  when MCs move up. *Front MC* always means
  the MC currently at the front during the battle.
- An empty MC slot is skipped: the next MC behind it moves up at battle start.

### Crew identity

Settled with the user in T-050 (D-052). When a player founds a crew, they give it:

- a **name**, typed in, at most `CREW_NAME_MAX = 20` characters and unique in the league
  (compared case-insensitively);
- **two colours** (main and trim) from the `CREW_COLOURS` palette (see [Presentation](#11-presentation));
- a **logo**, one of the shape logos in the same section.

The crew's units wear its colours, and the logo shows on the stage banner, the standings
and the hall of fame. **Bots** get a generated name *The ⟨adjective⟩ ⟨noun⟩*, two random
colours and a random logo from the seeded RNG. A generated name that is taken is rolled
again like a stage name (see [Stage names](#stage-names)). When a leaving player's crew
becomes a bot (see [Joining and leaving](#joining-and-leaving)), it keeps its identity.

### Crew state

Besides its identity and its units in the slots and on the bench, a crew keeps:

| Field | Meaning |
|---|---|
| `wallet` | Its gold, kept between rounds and sittings (see [Round flow](#3-round-flow)) |
| `hallOfFame` | The retired units that played for it (see [Age and retirement](#6-age-and-retirement)) |
| `record` | Its titles (champion and division wins, with the season) and its results per season. Cosmetic |

Whether the crew won its last battle (for `WIN_BONUS`) and its standing come from the
league's results, not from the crew. A crew's scouted units exist only during the shop phase.

| List | Entries |
|---|---|
| Bot crew adjectives | Midnight, Golden, Crunchy, Rowdy, Tiny, Electric, Sleepy, Cosmic, Soggy, Funky, Unstoppable, Suspicious |
| Bot crew nouns | Biscuits, Pigeons, Bandits, Goblins, Crumbs, Raccoons, Snacks, Wizards, Pretzels, Llamas, Mixtapes, Waffles |

### Unit state

Every unit is an **individual** (D-039), like a player in a sports manager. There are no
copies, no merging and no levels. An **archetype** (`ArchetypeDef`) is fixed data: a name, a
role (`mc` or `support`), stat ranges and an **ability pool**. A **unit** (`Unit`) is generated
from an archetype when it enters the [player market](#4-shop-phase-the-player-market) and
keeps this state for its whole career:

| Field | Meaning |
|---|---|
| `archetype` | The archetype it was generated from |
| `flow` | MCs only. Damage dealt per bar. Rolled from the archetype's range, grows with experience |
| `confidence` | MCs only. Damage an MC can take before choking. Rolled like `flow` |
| `abilities` | One ability from the archetype's pool at first, each with a `power` of 1 to `MAX_POWER = 3`. A second one is learned at an XP milestone (see [Growth](#growth)) |
| `xp` | Experience: +1 per battle played in an active slot, plus xp from abilities such as Studio Session (see [Growth](#growth)) |
| `age` | In years; one season is one year. Rolled from the seeded RNG when the unit is generated, with younger ages more likely (see [Age and retirement](#6-age-and-retirement)) |
| `salary` | Set from the unit's value when it is signed, and renegotiated at each season end (see [Salary](#51-salary)) |
| `look` | A 32-bit seed rolled when the unit is generated. `render/` draws the unit's whole appearance from it, so it looks the same on every peer and for its whole career (see [Presentation](#11-presentation)). It has no effect on the rules |
| `stageName` | A generated stage name, rolled from the seeded RNG when the unit is generated and kept for its whole career (see [Stage names](#stage-names)) |
| `record` | Career stats: battles played, bars landed, chokes, wins, and the crews it played for (with its battles and seasons for each). Updated from the event log after each battle (see [Round flow](#3-round-flow)). Shown on the unit, and kept in the hall of fame after it retires |

Buffs that happen **in battle** last until the end of that battle. Buffs that happen in the
**shop or upkeep** are permanent.

## 3. Round flow

One league round runs these phases in order for every crew in the league (the `app/` state
machine in T-023). Crews run by an AI (see [AI managers](#ai-managers)) go through the same
phases, with the AI making the shop decisions:

1. **Upkeep** (automatic)
   1. Income: `BASE_INCOME = 16` gold, plus `WIN_BONUS = 2` if the crew won its last battle.
      There is no catch-up income for losing crews (see [Pillars](#pillars)).
   2. `upkeep` abilities trigger (for example Negotiator's gold or Studio Session's xp).
   3. The wallet is capped at `WALLET_CAP = 20`, and anything above is lost.
   4. New rookies enter the player market (see [Supply](#supply)). This step runs once per
      league round for the whole league, not once per crew.
2. **Shop**: the [player market](#4-shop-phase-the-player-market) runs its bidding rounds;
   in between, each player can scout, sign scouted units, release units and arrange the
   lineup. The UI always shows the **payroll** that is due at lock-in. There is no timer by
   default (see [Slow players](#slow-players-and-the-optional-timer)). All random draws
   outside the battle come from seeds derived from the **league seed** (rolled once when the
   league is created and kept in the [league state](#league-state-and-hosting)), the round and,
   where it applies, the crew (and, for scouting, how often the crew has scouted this round),
   so replaying a round gives the same market.
3. **Lock-in**: possible once the bidding has ended. The payroll (see [Salary](#51-salary))
   is paid from the wallet. Lock-in is only possible while `wallet >= payroll`. Releasing
   units always makes that reachable, because it lowers the payroll. The locked crew is a
   snapshot that is sent to the opponent (D-004).
4. **Battle**: once **every** crew in the league has locked in, all of the round's battles
   start. Each battle's seed is agreed by its two crews only after both have locked in, so
   nobody knows it while shopping; for a crew run by an AI manager, the host stands in (T-027).
   `simulateBattle(crewA, crewB, seed)` runs on the peers and the event log is played
   back. Everyone watches their own battle at the same time.
5. **Result**: league points are awarded, the units' `record`s are updated from the event
   logs and xp is given out (see [Growth](#growth)). If this was the last round of the
   season, the [season end](#season-end) runs next. The host sends the new league state to
   every member, and everyone saves it (see [League state](#league-state-and-hosting)). After
   the result is saved the round is complete, and it's a clean place to stop.

A brand new crew has no units, `STARTING_GOLD = 40` gold (above the wallet cap once, so it
can sign about five average units at their ask, about 24 gold, and pay its first payroll,
about 14) and skips its first upkeep. The league's first round has no upkeep at all: the start
pool (see [Supply](#supply)) takes the place of its rookies.

## 4. Shop phase: the player market

Settled with the user in T-048 (D-039 to D-042). The shop works like a sports manager's
transfer market, not like Super Auto Pets: the whole league shares **one pool of unique
units**, crews **bid** for them, and signed units **grow** over their careers. Gold should
feel **tight**: once a crew is built, salaries eat most of the income, and every gold is a
choice between a signing, a scout and a better unit's salary.

### The market

| Part | Rule |
|---|---|
| **Public list** | The league-wide pool of free agents. Every member of every division sees the same list, with each unit's archetype, stats, abilities, age, record and **asking price** |
| **Scouting** | `SCOUT_COST = 1` gold: generates `SCOUT_COUNT = 2` new units that **only this crew** sees. Scouting again replaces them. A scouted unit can be signed at its ask at any time during the shop phase, with no bidding. Unsigned scouted units **vanish** at lock-in |
| **Release** | Free, with **no refund**. The unit returns to the public list at once as a free agent, with its stats, abilities, xp, age, `look`, record and stage name. It counts as the newest unit on the list |
| **Arrange** | Free. Units move between MC slots, support slots (by role) and the bench |

There is no freeze. A unit's **value** sets both its ask and its salary (settled in T-049,
D-046; the numbers are placeholders for T-031):

- `rating` = `flow + confidence` for an MC, `SUPPORT_BASE_RATING = 4` for a support unit,
  plus `ABILITY_RATING = 2` per point of ability `power`,
  plus a **youth premium** of `⌊seasons left / YOUTH_SEASONS_PER_RATING⌋`, with
  `YOUTH_SEASONS_PER_RATING = 2`. *Seasons left* is the role's retirement age minus the unit's
  age (1 on the farewell tour), so a young MC adds up to +2 and a young support unit up to +3;
- ask = `ceil(rating × ASK_PER_RATING)`, with `ASK_PER_RATING = 0.5`. For example, an
  18-year-old 3 / 3 MC with one ability has a rating of 3 + 3 + 2 + 2 = 10 and asks 5 gold;
  the same MC at 22 has a rating of 8 and asks 4.

### Bidding rounds

The shop phase starts with up to `BID_ROUNDS = 3` **bidding rounds** on the public list:

1. Every crew places **sealed bids** at the same time: any number of bids, each at least the
   unit's ask, or a pass. A crew's bids must be affordable together: the wallet minus all
   its bids must still cover the payroll including every unit it bids on, and it needs a
   free slot or bench place for each of them. A won unit goes into the first free active slot
   of its role (lowest slot number), or else the first free bench place, and the payroll
   check counts it there.
2. When every crew has bid or passed, the host reveals the bids. Each unit goes to its
   **highest bid**. Ties go to the crew ranked lower in the league (lower division, then
   lower position), then to a seeded coin flip. The winner pays its bid and the unit joins
   the crew at once; the other bidders keep their gold. Units are resolved in public-list
   order, and a winning bid the crew can no longer honour (no place or gold left) passes to
   the next best bid (D-066).
3. The next bidding round starts with the units that are left. Bidding ends after
   `BID_ROUNDS` rounds, or earlier when a round has no bids at all.

Scouting, signing scouted units, releasing and arranging are allowed at any time in the shop
phase. While a crew's sealed bids are open, it can only do these in ways that keep every open
bid valid (affordable, with a place for the unit). Units signed in the shop phase play in
that round's battle if they are in an active slot at lock-in. Bids and results travel
through the host, which resolves them with a pure `core/` function, so every peer agrees
(D-040). A signed unit triggers `sign` abilities.

### Supply

- **At league creation** the public list gets `POOL_START_PER_MEMBER = 6` generated units per
  member, so every new crew can sign a first lineup with some choice left.
- **Each upkeep** `ROOKIES_PER_ROUND = 3` new units are generated into the public list.
- **Released** units return to it as free agents. **Retired** units leave the game.
- The list holds at most `POOL_MAX = 16` units. The cap is checked at each upkeep after the
  rookies enter (so the start pool may be larger): the units that have been on the list
  longest leave the game until it fits. They don't retire, so they don't enter a hall of fame.
- A generated unit's **role** is drawn with the weights `MC_WEIGHT : SUPPORT_WEIGHT = 3 : 2`,
  matching the 3 MC and 2 support slots, then its archetype uniformly within that role. Its
  stats, first ability, age and stage name are rolled from the seeded RNG. Every ability starts
  at power 1. This applies to the start pool, rookies and scouted units alike.

### Growth

Units get better by playing (D-041):

- A unit gets `+1 xp` for every battle it plays in an active slot (stage or support), win or
  lose. Benched units get none, and there is no bonus for youth.
- Every `GROWTH_XP = 3` xp is a **growth step**. An MC gets +1 `flow` or +1 `confidence`
  (seeded pick). A support unit gets +1 `power` on one of its abilities below `MAX_POWER`
  (seeded pick); if all are maxed, the step does nothing.
- At `SECOND_ABILITY_XP = 12` xp a unit learns a **second ability**, drawn at random from its
  archetype's pool (not its first one), at power 1. 12 xp is also a growth step, which is
  applied first.
- xp from abilities (Studio Session) counts the same as xp from battles.
- Growth changes the unit's value, but its salary only changes at the season end.

## 5. Battle: "front MCs clash"

This is the first battle style (D-010). `simulateBattle` picks the resolver through a
`BattleStyle` interface, so later styles (T-037) don't need special cases. Settled with the
user in T-046: the MCs **take turns** like in a real rap battle (D-033), a **hype meter** per
crew powers the abilities (D-034), and every battle has a **winner** (D-035).

### Setup

1. Both crews' hype meters start at 0.
2. A seeded coin flip picks the **opening crew**. It takes the first turn, and whenever
   abilities of both crews trigger at the same moment, the opening crew's abilities resolve
   first. Within a crew the order is MC slot 1, 2, 3, then support slot 1, 2. There is no
   compensation for the other crew.
3. If a crew has no MC on stage, it loses at once. If neither has one, the coin flip's
   loser loses.
4. `beforeBattle` abilities trigger (for example Hometown Crowd, so a crew can start with
   hype), then `battleStart` abilities, then the front MC of each crew triggers `takeFront`.
   Each of these steps runs the queue empty before the next one starts. An MC triggers
   `takeFront` every time it becomes the front MC. If an Opener chokes during setup, the MC
   that moves up triggers `takeFront` then, and not a second time at this step. MCs can choke
   in setup before they drop a bar (for example to Headliner or Battle Kid).

### Turns

The battle is a series of **turns**. The crews strictly alternate (opening crew, other crew,
opening crew, …) for the whole battle, whatever happens on stage. On a crew's turn:

1. Its front MC **drops a bar**: it deals damage equal to its `flow` to the enemy front
   MC's `confidence`. The crew gains `HYPE_PER_BAR = 1` hype.
2. The MC that dropped the bar triggers `barLanded`. The enemy front MC triggers `hurt` if
   it still has confidence above 0.
3. An MC at 0 confidence **chokes** and leaves the stage. `choke` abilities trigger. The
   next MC of that crew moves up and triggers `takeFront`. It answers on its crew's next turn.

Abilities can deal damage outside the bars as well (`diss`). Chokes are checked after every
single effect, so a choke caused by an ability triggers its own `choke` abilities. An ability
that hits several MCs is one effect per target, in stage order.
Triggered abilities go on one FIFO queue, which is processed until it is empty before the
next turn starts. For a bar, the queue order is: the `barLanded` abilities, then the `hurt` or
`choke` abilities, then the `takeFront` of the MC that moved up.

- An ability's **targets are picked when it resolves**, not when it is queued.
- If an MC **behind the front** chokes (from a diss), it leaves the stage and the MCs behind
  it close up. The front MC doesn't change, so nothing triggers `takeFront`.
- An ability that was **already queued when its MC choked still resolves** (D-055). Targets
  relative to that MC (`friendBehind`, `allFriendsBehind`) use the place it held when it
  choked, and a buff on the choked MC itself does nothing.

### Hype meter

Each crew has a **hype meter** from 0 to `HYPE_MAX = 10`: how hard the crowd is behind it.
It lasts for one battle only. The crowd on screen reacts to both meters, and it is the main
way a battle reads as going one way or the other.

| Event | Hype change |
|---|---|
| The crew's MC drops a bar | `+HYPE_PER_BAR = 1` |
| One of the crew's abilities deals `diss` damage | `+HYPE_PER_DISS = 1`, once per ability however many MCs it hits |
| An enemy MC chokes | `+HYPE_PER_CHOKE = 2` |
| One of the crew's own MCs chokes | `-HYPE_LOSS_ON_CHOKE = 2` (never below 0) |

Abilities can also change hype directly: the `hype` effect adds hype to the ability's own
crew or drains it from the enemy crew (see [Effects](#effects-5)). Drain is rare on purpose.
The hype change from a choke happens as the MC chokes, before any `choke` ability resolves.

**Hype powers the crowd abilities** (D-044). There is no global hype threshold and no
general hype bonus: most abilities ignore the crowd, and a few **crowd abilities** take their
value from the hype itself, as `⌊H / N⌋` of their crew's current hype *H* (for example
Wordplay diss for ⌊H / 3⌋; see [Values](#values)). So every point of hype counts a little,
and a crew built around the crowd wants to get loud early. Abilities that resolve outside a
battle (`sign`, `upkeep`) never use hype.

### End

- The battle ends as soon as one crew has no MC left on stage, and that crew **loses**.
  Effects resolve one at a time, so one crew is always out first. An ability chain that
  would knock out the winner too is stopped at that point.
- After `MAX_TURNS = 40` turns the battle ends too, so every battle terminates (the
  property test in T-015). Then the crew that **lost more confidence** in total loses
  (the damage its MCs took, counting only confidence actually lost). If that is equal, the
  crew that **lost confidence first** loses. If neither crew lost any, the coin flip's loser
  loses.
- A battle is **never a draw**. So league matches have no draws either (see [League](#7-league)).
- **MC margin** = the winner's MCs still on stage. It is used as a league tiebreak.

All random choices (coin flip, random targets) come from the seed through the seeded RNG
(T-010). The same crews and seed always give the same `BattleEvent[]`.

### Pacing

- A battle should play back in **30 to 60 seconds** at normal speed, so a round still fits a
  coffee break. Battles are **short and punchy** (D-054): balancing (T-031) aims for a typical
  battle of about 6 to 12 turns, each with about 4 to 6 seconds of screen time, and
  `MAX_TURNS` should almost never be reached. (The T-051 playtest saw 3 to 8 turns with the
  current stats.)
- Playback has a **2× speed** button. There is no skip, because the battle is a pillar.
- Each beat has a fixed screen time (a render constant). A battle whose beats add up to more
  than 60 s plays faster to fit; a shorter one plays slower, by at most `MAX_STRETCH = 1.4`, so
  setup knockouts stay short (T-022, D-074).
- Every bar, choke, ability and big hype swing gets its own beat on screen (see [Presentation](#11-presentation)).

### 5.1 Salary

Every unit in the crew costs its `salary` at each lock-in (D-012):

- A unit's salary is set from its value when it is signed: `ceil(rating × SALARY_PER_RATING)`,
  with `SALARY_PER_RATING = 0.25` (see [The market](#the-market) for `rating`). An
  18-year-old 3 / 3 MC with one power-1 ability (rating 10) costs 3.
- It stays fixed during the season and is **renegotiated at each season end**: it is
  recomputed from the unit's value then, so a unit that grew costs more next season, and the
  youth premium shrinks as the unit ages (D-042, D-046).
- On the bench a unit costs half, rounded down (`BENCH_SALARY_FACTOR = 0.5`), so a benched
  unit with salary 1 is free.

With `BASE_INCOME = 16`, five average units in active slots (salary about 3 each) cost most
of the income and leave 1 to 3 gold, plus the win bonus, for signings; grown stars cost more
than that (D-053). That is intended: gold is tight, and salary is the soft cap
on crew power (T-047, T-048).

## 6. Age and retirement

Settled with the user in T-047 (D-038). Age is the only thing that limits how long a unit
stays, and it only decides *when* a unit retires. Age alone never changes how a unit plays;
only [growth](#growth) does.

- **Age is in years, and one season is one year.** Every unit in the crew gets one year
  older at the season end, including benched units and crews an AI managed for an absent
  player.
- **Starting age.** When a unit is generated for the market, its age is drawn from the seeded
  RNG between `SIGN_AGE_MIN = 18` and its role's retirement age − 1. Younger is more likely:
  the weights fall linearly, so the youngest age has the highest weight and the oldest a
  weight of 1. Free agents on the public list age at the season end like everyone else.
- **Retirement age** is global, known and depends on the **role**: `MC_RETIRE_AGE = 23`
  and `SUPPORT_RETIRE_AGE = 25`. So an MC stays 1 to 5 seasons (about 3.7 on average) and
  a support unit 1 to 7 (about 5). A unit generated in a season counts that season as its first.
- **Farewell tour.** A unit whose age is its retirement age − 1 is in its **last season**.
  It shows a "farewell tour" badge for that whole season; the rules don't change. Units
  normally reach it at a season end, where it is announced along with the season results. A
  unit generated or signed at that age is on its farewell tour right away.
- **Season end**, after the season's last round (the full order is in
  [Season end](#season-end)): every unit on its farewell tour **retires** (in crews and on the
  public list); then every remaining unit's age goes up by 1, and the units whose last season
  starts now are announced; then every crew unit's salary is renegotiated (see [Salary](#51-salary)).
- A retiring unit leaves the game. It pays nothing out, as releasing doesn't either (D-042).
- **Hall of fame.** Each crew keeps a hall of fame. When a unit retires, from a crew or from
  the public list, it goes into the hall of fame of **every crew it played for** (D-056): its
  `stageName`, archetype, final stats and abilities, its seasons and battles with that crew and
  its final `record`. It is shown in the crew screen and saved with the crew in the league
  state. It has no effect on the rules (pillar 1).

## 7. League

A friend group has **one league** (D-029): a pyramid of divisions with promotion and
relegation, like a football league system. Each player owns **exactly one crew**, and that
crew is a member of this league for its whole life. There is no server (D-004). The league is
a saved state that every member keeps a copy of, and any member can host a sitting. The rules
below are pure `core/` functions (T-034). Settled with the user in T-045 (Q-011 confirmed).

### Members

A **member** is a crew plus who runs it:

- **Player**: a human-owned crew. When the player isn't at a sitting, an
  [AI manager](#ai-managers) runs the crew for them.
- **Bot**: a filler crew that an AI manager always runs. When the league is created, the host
  picks how many bots to add, and more can be added between seasons.

### Divisions

| Topic | Rule |
|---|---|
| Size | A division holds up to `DIVISION_MAX = 6` members. A group of 2 to 6 plays in one division |
| Splitting | When the league is created, and at each season start, the league uses the fewest divisions that keep everyone at or below `DIVISION_MAX`, sized as evenly as possible. Members are placed by rank: division first, then final position. A new league orders its members with a seeded shuffle |
| Equal, even sizes | At league creation and at each season start, bots are added until every division has the size of the largest one, rounded up to even (Q-018, D-057). So there are **no byes**, and every division plays the same number of rounds and reaches the league-wide season end together. For example 9 members split 5 + 4 and play as 6 + 6 with 3 bots |
| Promotion | With more than one division, the top `PROMOTE_COUNT = 1` of each lower division goes up and the bottom `PROMOTE_COUNT` of each higher division goes down |
| Titles | The winner of the top division is crowned **champion**, and every division winner gets a title. Both are cosmetic and go into the crew's `record` |

### Seasons

| Topic | Rule |
|---|---|
| Length | A **double round robin** inside each division: every pair meets twice. If that is fewer than `MIN_SEASON_ROUNDS = 3` rounds, it repeats until the season reaches that many (2 members play 3 rounds). Every round of the season is played, even once the division winner is decided. 4 members play 6 rounds and 6 members play 10 |
| Pairing | The circle method over the division's slots, shuffled by the season seed (derived from the league seed and the season number), so the pairings are deterministic and fair and change each season. The second half repeats the first with the sides swapped |
| Points | Win `POINTS_WIN = 3`, loss 0. Battles can't end drawn (D-035), so there are no draws |
| Tiebreaks | Head-to-head points (in the games between all crews tied on points), then total MC margin, then a seeded coin flip |
| Catch-up | None. Crews are meant to snowball (see [Pillars](#pillars)), and divisions keep strong and weak crews apart |

A season usually spans several sittings, and one season is one year of the units' age. A
season ends after its last round, and the next season starts at the next round.

### Season end

The season end runs once for the whole league, right after the result of the season's last
round, in this order:

1. **Titles**: the final standings are fixed, and each division winner (and the champion)
   gets its title in the crew's `record`.
2. **Retirement**: every unit on its farewell tour retires, from crews and from the public
   list, and enters the hall of fame of every crew it played for (see [Age and retirement](#6-age-and-retirement)).
3. **Ageing**: every remaining unit, in crews and on the public list, gets one year older.
   The new farewell tours are announced.
4. **Salaries**: every crew unit's salary is renegotiated from its value (see [Salary](#51-salary)).
5. **Divisions**: promotion and relegation, then the new split, newcomers who waited join the
   bottom division, and bots pad every division (see [Divisions](#divisions)).
6. **Schedule**: the new season's pairings are drawn from the season seed.

### Joining and leaving

- **New player mid-season:** if a division has a bot, the newcomer takes over the schedule
  slot of the lowest-placed bot in the lowest division that has one, at once, with a fresh
  crew. The slot's points stay, and the bot's crew is dropped; its units become free agents
  (D-068). If no division has a bot, the newcomer joins the bottom division at the next
  season start.
- **Player leaves the league for good:** their crew becomes a bot, and an AI manager runs it
  from then on. So the counts stay even.
- **Player misses a sitting:** nothing to do. The AI manager plays their rounds (see below).

### AI managers

AI players are part of the real game (Q-008), not only a test tool. One simple AI manager
(built in T-019) runs every crew that has no human at the sitting:

- **Bots** always.
- **Absent players**, fully (D-030). It shops, pays salaries and rotates the bench under the same
  rules as a human, so the crew ages and earns as usual. When the player comes back,
  they take over the crew as the AI left it. A "while you were away" summary lists the rounds
  and changes.

The AI plays the real economy with a simple greedy policy: bid the ask on the best-value units
it can afford for its empty slots, scout when nothing fits, release the weakest unit for a clearly
better one, and lock in once gold runs low. It should be beatable by
a thoughtful human, but not silly. Its decisions come from seeded randomness, so every peer
gets the same result. In detail (T-019, D-071):

- **Strength** is a unit's rating without the youth premium: its stats (or
  `SUPPORT_BASE_RATING`) plus `ABILITY_RATING` per point of power. **Best value** is strength
  per gold of ask plus one salary, with a seeded ±10% taste per crew and round.
- **Bidding:** it fills empty MC slots first, then support slots, best value first, and makes one
  upgrade bid for a unit at least 3 strength above its weakest active unit of that role. Each bid
  is the ask, sometimes one more. It keeps its payroll within `BASE_INCOME`, so it can pay again
  next round, and before the first bidding round it releases its worst strength per salary (bench
  first, never its last MC) until it is.
- **Scouting:** after the bidding, while an active slot is still empty, it scouts (at most twice)
  and signs a scouted unit that fills the slot.
- **Lineup:** its strongest 3 MCs and 2 supports play. The MCs take the order with the best fit:
  confidence counts double for the Opener (it takes the setup disses and the first bars), flow
  counts double for the Closer, and an ability with an `inSlot` condition adds 4 in its slot.
  Bench units weaker than every active unit of their role are released. If it still can't pay
  the payroll, it releases its worst strength per salary before the lock-in.

### League state and hosting

The **league state** is the whole league: the league seed, the members, every crew (identity,
units, wallet, hall of fame, record), the player market's public list, the divisions, the season
number and schedule, the results so far, the standings and the number of the last completed round. It is also each player's save (D-031):

- After every completed round the host sends the new league state to every connected member,
  and each one stores it locally. Crews are part of it, so the host can run absent players' crews.
- **Starting a sitting:** any member opens a lobby with their saved league, and others join by
  room code. The copy with the highest completed round wins, and the host adopts it if a joiner
  has a newer one. Then the host starts the next round.
- **Host disconnects mid-round** (Q-013): that round is voided. Everyone falls back to the
  last completed round, and any member can host again. The market seeds are derived from the
  round (see [Round flow](#3-round-flow)), so the replayed round offers the same rookies and scouts.
- **Player disconnects mid-round:** they pass in any remaining bidding round, and their current
  lineup is locked in, as when the
  [timer](#slow-players-and-the-optional-timer) runs out.
- **Validation** (Q-012): friends are trusted. Incoming messages and saves are checked
  against their zod schema, so malformed data can't crash a peer, but the host doesn't check
  whether a crew is *legal*.

### Slow players and the optional timer

The shop has no clock by default (D-026). Each round's battles start only when every crew has
locked in, so the others wait (Q-014, D-032):

- The lobby shows who is still shopping. Any player can send that player a **nudge**, a
  friendly poke with a sound. It has no effect on the rules.
- The host can turn on a **shop timer** for the sitting: `SHOP_TIMER_SECONDS = 120`, off by
  default. It runs once for each [bidding round](#bidding-rounds) (a crew that hasn't bid
  passes) and once more for the lineup after the bidding. When the last one runs out, the
  player's **current lineup** is locked in. If the wallet can't cover the payroll, units are
  released one at a time until it can: the unit that costs least at lock-in first (bench
  salaries halved), then bench before active slots, then the highest slot. Units that cost
  nothing are kept, because releasing them wouldn't help (D-066).

## 8. Starting archetypes and abilities

Settled with the user in T-049 (D-043 to D-047). Units are individuals generated from
**archetypes** (D-039). An archetype has a role, stat ranges and an **ability pool**: a new
unit rolls its first ability from the pool, and later learns a second one from it (see
[Growth](#growth)). Each pool holds the archetype's **signature** abilities plus the one
**shared** ability of its role, so the archetype tells you the plan and the rolled ability
tells you the details.

**Stats first, abilities spice.** Flow and confidence decide most battles. Abilities swing the
close ones and make the combos (pillar 2), but a single ability should rarely beat a clearly
bigger crew on its own. Every number here is a placeholder for the balance pass (T-031).

### MC archetypes

Stats are rolled uniformly within the range.

| Archetype | Personality | Flow | Confidence | Pool |
|---|---|---|---|---|
| **Lyricist** | Wordy glass cannon: huge bars, folds under pressure | 3–5 | 1–3 | Punchliner, Wordplay, Multisyllabic, Clapback |
| **Battle Rapper** | Aggressive opener who lives for the first exchange | 2–4 | 2–4 | Battle Kid, Headliner, Comeback Line, Clapback |
| **Storyteller** | Slow-burning tank who protects the crew | 1–3 | 3–6 | Street Poet, The OG, Long Verse, Clapback |
| **Freestyler** | Anything can happen: wide rolls, a clutch Closer | 1–5 | 1–5 | Off the Top, Crowd Surfer, Wildcard, Clapback |
| **Hitmaker** | The crowd's favourite: modest stats, feeds the hype | 2–3 | 2–4 | Chart Topper, Feature Verse, Encore, Clapback |

### Support archetypes

| Archetype | Personality | Pool |
|---|---|---|
| **DJ** | Rewards every bar and scratches in on entrances | Drop the Beat, Scratch, Crowd Mix, Shout-out |
| **Hype Man** | Crowd control: keeps the energy up when things go wrong | Get Up!, Make Some Noise!, Hype Wave, Shout-out |
| **Producer** | The long game: better beats and growth in the studio | Beatmaker, Studio Session, Remix, Shout-out |
| **Vocal Coach** | Keeps MCs standing and trains them between rounds | Warm-up, Breathe!, Voice Lessons, Shout-out |
| **Manager** | Brings the hometown crowd, pays hecklers, haggles for gold | Hometown Crowd, Paid Hecklers, Negotiator, Shout-out |

### Abilities

*H* is the ability's crew's current hype when the ability resolves (see [Hype meter](#hype-meter)),
and ⌊ ⌋ rounds down. MC abilities never gain power (MCs grow through stats, see
[Growth](#growth)), so they have a single value. Support abilities list their value at power
1 / 2 / 3. **Once** means once per battle (see [Conditions](#conditions)).

MC abilities:

| Ability | Archetype | Trigger | Effect | Value |
|---|---|---|---|---|
| **Punchliner** | Lyricist | `barLanded` (self) | Diss the enemy MC behind the enemy front | 1 |
| **Wordplay** | Lyricist | `barLanded` (self) | Diss the enemy front MC | ⌊H / 3⌋ |
| **Multisyllabic** | Lyricist | `takeFront` (self) | Gains flow | 1 |
| **Battle Kid** | Battle Rapper | `takeFront` (self) | Diss the enemy front MC | 2 |
| **Headliner** | Battle Rapper | `battleStart`, if **Opener** | Diss every enemy MC | 1 |
| **Comeback Line** | Battle Rapper | `hurt` (self) | The enemy crew loses hype | 1 |
| **Street Poet** | Storyteller | `choke` (self) | Pass the mic: the MC behind it gets flow and confidence | 2 |
| **The OG** | Storyteller | `hurt` (self) | Every friendly MC behind it gets flow | 1 |
| **Long Verse** | Storyteller | `battleStart`, if **Middle** | Gains confidence | 2 |
| **Off the Top** | Freestyler | `battleStart`, if **Closer** | Gains flow and confidence | 2 |
| **Crowd Surfer** | Freestyler | `takeFront` (self) | Gains flow | ⌊H / 3⌋ |
| **Wildcard** | Freestyler | `barLanded` (self) | Diss a random enemy MC on stage | 1 |
| **Chart Topper** | Hitmaker | `barLanded` (self) | Its crew gains hype | 1 |
| **Feature Verse** | Hitmaker | `sign` | One other random MC in the crew (stage or bench) gets confidence, permanently | 1 |
| **Encore** | Hitmaker | `choke` (self) | Goes out with a bang: diss the enemy front MC | ⌊H / 2⌋ |
| **Clapback** | shared (MC) | `hurt` (self), once | Diss the enemy front MC | 1 |

Support abilities:

| Ability | Archetype | Trigger | Effect | Power 1 / 2 / 3 |
|---|---|---|---|---|
| **Drop the Beat** | DJ | `barLanded` (friend) | The MC that landed the bar gets flow | 1 / 2 / 3 |
| **Scratch** | DJ | `takeFront` (friend) | Diss the enemy front MC | 1 / 2 / 3 |
| **Crowd Mix** | DJ | `battleStart` | Its crew gains hype | 1 / 2 / 3 |
| **Get Up!** | Hype Man | `choke` (friend) | The new front MC gets confidence | 2 / 4 / 6 |
| **Make Some Noise!** | Hype Man | `takeFront` (friend) | Its crew gains hype | 1 / 2 / 3 |
| **Hype Wave** | Hype Man | `choke` (friend) | The new front MC gets flow | ⌊H / 3⌋ + 0 / 1 / 2 |
| **Beatmaker** | Producer | `battleStart` | The front MC gets flow | 1 / 2 / 3 |
| **Studio Session** | Producer | `upkeep` | A random MC in the crew (stage or bench) gets xp | 1 / 1 / 2 |
| **Remix** | Producer | `choke` (friend) | The new front MC gets flow | 1 / 2 / 3 |
| **Warm-up** | Vocal Coach | `battleStart` | The front MC gets confidence | 1 / 2 / 3 |
| **Breathe!** | Vocal Coach | `hurt` (friend), once | The hurt MC gets confidence | 2 / 3 / 4 |
| **Voice Lessons** | Vocal Coach | `upkeep` | A random MC in the crew (stage or bench) gets confidence, permanently | 1 / 1 / 2 |
| **Hometown Crowd** | Manager | `beforeBattle` | Its crew gains hype, so the battle starts above 0 | 1 / 2 / 3 |
| **Paid Hecklers** | Manager | `choke` (friend) | The enemy crew loses hype | 1 / 2 / 3 |
| **Negotiator** | Manager | `upkeep` | The crew gains gold (the wallet cap still applies) | 1 / 1 / 2 |
| **Shout-out** | shared (support) | `battleStart` | A random friendly MC on stage gets confidence | 1 / 2 / 3 |

Design notes:

- Every trigger, subject and position condition is used by at least one ability.
- **Crowd abilities** (Wordplay, Crowd Surfer, Encore, Hype Wave) take their value from the
  hype itself; every other ability ignores the crowd (D-044). Hype gain comes from Chart
  Topper, Crowd Mix, Make Some Noise! and Hometown Crowd. Hype drain is rare on purpose: only
  Comeback Line and Paid Hecklers take hype from the enemy.
- `sign` abilities always resolve at power 1, because a unit is signed before it can grow,
  and a second ability is learned after the unit joined, so it never triggers `sign`.
- The only gold effect is Negotiator's (D-045). It stays small and capped, so salary is still
  the soft cap on crew power.

### Stage names

A unit's `stageName` is rolled when it is generated (D-028, D-047): an optional **prefix**
(with chance `NAME_PREFIX_CHANCE = 0.6`) and one **word**. The prefix comes from the shared
prefixes plus the archetype's own; the word comes from the shared words plus the archetype's
own, uniformly. Examples: *Lil Syntax*, *MC Thunderclap*, *Big Mood*, *Beats by Snare*, *Biscuit*.

- No two living units in a league (in crews, on the public list or scouted) share a stage
  name, compared case-insensitively. If a roll is taken, it is rolled again, up to
  `NAME_REROLLS = 10` times; after that the smallest free numeral is added to the last roll
  (*Biscuit II*, *Biscuit III*). A retired unit's name is free again.
- Names are invented and never the name of a real artist (see [Non-goals](#non-goals)). Words
  that complete a real artist's name with one of the prefixes are left out of the lists.

| List | Entries |
|---|---|
| Shared prefixes | Lil, Big, Young, King, Queen, Lady, Kid, Doctor, Professor, Captain, Sir, Baby, Grand, Mister, Miss, Uncle, Auntie |
| Shared words | Biscuit, Static, Thunderclap, Mood, Waffle, Echo, Velvet, Pixel, Comet, Pretzel, Glitter, Tornado, Noodle, Jackpot, Avalanche, Cactus, Meteor, Sprinkles, Voltage, Marmalade |
| MC prefixes (all MC archetypes) | MC |
| Lyricist words | Syntax, Thesaurus, Metaphor, Haiku, Footnote, Semicolon, Vocab, Sonnet, Punctuation, Quill, Alliteration, Paragraph |
| Battle Rapper words | Knuckles, Uppercut, Roast, Smackdown, Brawl, Grudge, Spicy, Venom, Rumble, Headlock, Mayhem, Sucker Punch |
| Storyteller words | Chapter, Campfire, Fable, Legend, Saga, Narrator, Folklore, Epilogue, Almanac, Memoir, Lantern, Riddle |
| Freestyler words | Improv, Dice, Shuffle, Offbeat, Zigzag, Tangent, Curveball, Hiccup, Jazzhands, Whim, Coinflip, Plot Twist |
| Hitmaker words | Platinum, Chorus, Hook, Replay, Earworm, Jingle, Spotlight, Glamour, Top Ten, Bling, Sparkle, Radio Edit |
| DJ prefix / words | DJ / Scratchcard, Vinyl, Crossfade, Bassline, Needle, Wax, Turntable, Subwoofer, Loop, Rewind, Wobble, Fader |
| Hype Man prefix / words | Hype / Megaphone, Confetti, Foghorn, Airhorn, Stadium, Holler, Pompom, Firework, Hoopla, Ruckus, Jumbotron, Mosh Pit |
| Producer prefix / words | Beats by / Metronome, Sampler, Mixdown, Reverb, Snare, Knob, Waveform, Kickdrum, Mastertape, Plugin, Hi-Hat, Low End |
| Vocal Coach prefix / words | Coach / Larynx, Honey, Lozenge, Scales, Falsetto, Whistle, Humidifier, Tonsil, Chamomile, Octave, Vibrato, Harmony |
| Manager prefix / words | Boss / Contract, Briefcase, Invoice, Handshake, Loophole, Paperclip, Royalty, Fine Print, Percentage, Rolodex, Clipboard, Spreadsheet |

## 9. Abilities

An ability is **data**: a trigger, optional conditions, a named effect, a target and a value
(fixed per `power`, or taken from the crowd's hype). `core/` implements each effect and target
once, as a small named function (T-013). A unit has one ability, and a second one once it
reaches `SECOND_ABILITY_XP` (see [Growth](#growth)). A unit's abilities resolve in the order it
learned them.

### Trigger types (8)

| Trigger | Fires when | Subject |
|---|---|---|
| `beforeBattle` | once, after battle setup and before `battleStart` | – |
| `battleStart` | once, after `beforeBattle` | – |
| `takeFront` | an MC becomes the front MC, including the Opener at battle start | `self` or `friend` (any other friendly MC) |
| `barLanded` | an MC drops a bar on its turn (ability damage doesn't count) | `self` or `friend` |
| `hurt` | an MC takes damage from any source and still has confidence above 0 | `self` or `friend` |
| `choke` | an MC reaches 0 confidence and leaves the stage | `self` or `friend` |
| `sign` | this unit joins a crew, by a won bid or a scouted signing | – |
| `upkeep` | each upkeep, after income and before the wallet cap | – |

- Support units never take the stage, so for them `takeFront`, `barLanded`, `hurt` and
  `choke` only make sense with the subject `friend`.
- Benched units' abilities don't trigger, except `sign` (a unit signed straight onto the
  bench still triggers it).
- An MC that has choked doesn't trigger anything afterwards, except its own `choke`. Its
  abilities that were already queued still resolve (see [Turns](#turns)).
- When an MC chokes, the next MC of its crew moves up **at once**, before the queued `choke`
  abilities resolve, so "the new front MC" is already in place for them. Its `takeFront` goes on
  the queue after those `choke` abilities.

### Conditions

- `inSlot: opener | middle | closer`: the MC's starting slot (see [Crew](#2-crew)).
- `oncePerBattle`: the ability resolves at most once per battle for this unit; later triggers
  are ignored.

### Values

- **Fixed**: one number per `power` (1 to `MAX_POWER`). MC abilities only ever use power 1.
- **From hype**: `⌊H / N⌋` plus a number per `power`, where *H* is the crew's hype when the
  ability resolves and `N` is part of the ability's data. This is the only way hype changes an
  ability (D-044).
- A value of 0 still resolves (it shows on screen) but changes nothing: a diss of 0 deals no
  damage, so it triggers no `hurt` and gives no hype.

### Effects (5)

| Effect | What it does | In battle | Outside battle (`sign`, `upkeep`) |
|---|---|---|---|
| `buff` | adds flow and/or confidence to friendly MCs | until the battle ends | permanent |
| `diss` | deals damage to enemy MCs' confidence, and gives the crew `HYPE_PER_DISS` hype | can trigger `hurt` and `choke` | – |
| `hype` | its own crew gains hype, or the enemy crew loses hype (within 0 to `HYPE_MAX`) | yes | – |
| `gold` | the crew gains gold | – | yes; the wallet cap applies after all `upkeep` abilities |
| `xp` | the target gains xp; growth steps and the second ability apply at once (see [Growth](#growth)) | – | yes |

### Targets

- Friendly: `self`, `frontFriend`, `friendBehind` (the next MC behind this one on stage; for a choked MC, the one that was
  behind it when it choked),
  `allFriendsBehind`, `triggeringFriend` (the MC that caused the trigger),
  `randomFriendOnStage`, `randomOtherCrewMC` (stage or bench, not this unit),
  `randomCrewMC` (stage or bench).
- Enemy: `enemyFront`, `enemyBehindFront` (the second enemy MC on stage), `randomEnemy` (on
  stage), `allEnemies`.
- Crews (for `hype` and `gold`): `ownCrew`, `enemyCrew`.
- If a target doesn't exist (for example, no MC behind), the effect does nothing.
  Random targets use the seeded RNG.
- Every target is used by at least one ability in §8. A new target is added here only
  together with the ability that needs it.

### Rules for new abilities

- No effect may cause its own trigger again without a turn in between (for example, no
  `hurt` ability that deals damage to friendly MCs). An ability that answers `hurt` with a
  `diss` must be `oncePerBattle`, so two of them can't ping-pong (Clapback). Then the FIFO
  queue from [Turns](#turns) always runs empty, because each chain is bounded.
- `hype`, `gold` and `xp` effects trigger nothing, so they can't start a chain.
- New triggers, effects or targets are added to the tables above first, then to `core/`.

A sketch of the data shape, for orientation only (T-011 and T-013 decide the real types):

```ts
const streetPoet: AbilityDef = {
  id: 'street-poet',
  name: 'Street Poet',
  role: 'mc',
  trigger: { kind: 'choke', subject: 'self' },
  effect: 'buff',
  target: 'friendBehind',
  value: { kind: 'fixed', byPower: [{ flow: 2, confidence: 2 }] },
};

const hypeWave: AbilityDef = {
  id: 'hype-wave',
  name: 'Hype Wave',
  role: 'support',
  trigger: { kind: 'choke', subject: 'friend' },
  effect: 'buff',
  target: 'frontFriend',
  value: { kind: 'fromHype', divisor: 3, byPower: [{ flow: 0 }, { flow: 1 }, { flow: 2 }] },
};

const storyteller: ArchetypeDef = {
  id: 'storyteller',
  name: 'Storyteller',
  role: 'mc',
  flow: { min: 1, max: 3 },
  confidence: { min: 3, max: 6 },
  abilityPool: ['street-poet', 'the-og', 'long-verse', 'clapback'],
  namePrefixes: [],
  nameWords: ['Chapter', 'Campfire' /* … */],
};
```

## 10. Tunables

Every name above with its default. `core/` keeps them in one typed table (T-012). The
render constants of [Presentation](#11-presentation) are not in it. Stat ranges and ability
values live in the archetype and ability tables of §8.

| Name | Default | Section |
|---|---|---|
| `BENCH_SIZE` | 3 | Crew |
| `CREW_NAME_MAX` | 20 | Crew identity |
| `STARTING_GOLD` | 40 | Round flow |
| `BASE_INCOME` | 16 | Round flow |
| `WIN_BONUS` | 2 | Round flow |
| `WALLET_CAP` | 20 | Round flow |
| `SCOUT_COST` / `SCOUT_COUNT` | 1 / 2 | Market |
| `BID_ROUNDS` | 3 | Market |
| `SUPPORT_BASE_RATING` | 4 | Market |
| `ABILITY_RATING` | 2 | Market |
| `ASK_PER_RATING` | 0.5 (rounded up) | Market |
| `YOUTH_SEASONS_PER_RATING` | 2 (rounded down) | Market |
| `POOL_START_PER_MEMBER` | 6 | Market |
| `ROOKIES_PER_ROUND` | 3 | Market |
| `POOL_MAX` | 16 | Market |
| `MC_WEIGHT` / `SUPPORT_WEIGHT` | 3 / 2 | Market |
| `MAX_POWER` | 3 | Unit state, Growth |
| `GROWTH_XP` | 3 | Growth |
| `SECOND_ABILITY_XP` | 12 | Growth |
| `MAX_TURNS` | 40 | Battle (a safety limit; D-054 aims for 6 to 12 turns) |
| `HYPE_MAX` | 10 | Battle |
| `HYPE_PER_BAR` / `HYPE_PER_DISS` / `HYPE_PER_CHOKE` | 1 / 1 / 2 | Battle |
| `HYPE_LOSS_ON_CHOKE` | 2 | Battle |
| `SALARY_PER_RATING` | 0.25 (rounded up) | Salary |
| `BENCH_SALARY_FACTOR` | 0.5 (rounded down) | Salary |
| `SIGN_AGE_MIN` | 18 | Age and retirement |
| `MC_RETIRE_AGE` / `SUPPORT_RETIRE_AGE` | 23 / 25 | Age and retirement |
| `NAME_PREFIX_CHANCE` | 0.6 | Stage names |
| `NAME_REROLLS` | 10 | Stage names, Crew identity |
| `DIVISION_MAX` | 6 | League |
| `MIN_SEASON_ROUNDS` | 3 | League |
| `POINTS_WIN` | 3 | League |
| `PROMOTE_COUNT` | 1 | League |
| `SHOP_TIMER_SECONDS` | 120 (off by default) | League |

## 11. Presentation

Settled with the user in T-050 (D-048 to D-052). None of this changes a rule: `render/` draws
it from core state and battle event logs (D-005). Everything is drawn at runtime from shapes
and text, with no image or audio files. The numbers in this section are render constants, not
`core/` tunables, so they aren't in the [Tunables](#10-tunables) table.

### Title

The game is called **Mic Drop League** (D-048). The repo keeps its working name `rap-battle`.

### Look

**Style: 90s block party** (D-049). A daytime street: a brick wall with a painted backdrop,
blue sky, a boombox, bright primary colours and blocky lettering built from shapes (bold
sans-serif text with a thick outline and a drop shadow, no font files). The screen is drawn
at a design resolution of `DESIGN_WIDTH × DESIGN_HEIGHT = 1280 × 720` and scaled to fit the
browser window, keeping the aspect ratio (desktop only, D-008).

**Characters: chunky paper-cut figures.** A big round head, a rounded-rect body and stubby
limbs, drawn as flat shapes with a dark outline. Everything else is **rolled from the unit's
`look` seed** and has no link to its archetype: body shape (tall, round, square), skin tone,
hair or hat, face (eyes, brows, mouth) and one accessory (shades, cap, bandana, headphones,
chain…). The **outfit** is tinted in the crew's main and trim colours, and a free agent in
the market wears neutral grey.

**The archetype shows as a badge.** A small round badge at the unit's feet holds the
archetype icon, next to a name plate with the stage name. Hovering shows the archetype's name
and personality (§8).

| Archetype | Icon | Archetype | Icon |
|---|---|---|---|
| Lyricist | quill | DJ | vinyl record |
| Battle Rapper | boxing glove | Hype Man | megaphone |
| Storyteller | open book | Producer | mixing knob |
| Freestyler | die | Vocal Coach | music note |
| Hitmaker | star | Manager | briefcase |

**Careers show on the figure** (pillar 1):

- Each growth step (see [Growth](#growth)) adds one visible piece of **bling**: a chain, then
  rings, a cap badge and a gold tooth, then bigger chains. At most `BLING_MAX = 4` pieces are
  drawn; after that the chain just gets thicker.
- A unit in its **farewell season** (see [Age and retirement](#6-age-and-retirement)) has
  grey hair and a "Farewell tour" sash.
- A retired unit gets a **framed portrait** in the hall of fame, with its record.

**Crew colours and logos.** `CREW_COLOURS` has 10 colours: red, orange, yellow, lime, green,
teal, sky blue, royal blue, purple and pink, plus black and white as trim only. The logos are
simple shapes: star, crown, lightning bolt, flame, diamond, heart, vinyl, spray can.

### Screens

**Home hub with tabs** (D-050). Out of battle, the home screen shows your crew hanging out on
the block, your wallet, the payroll due at lock-in and the next opponent. Tabs lead to:

- **Market**: a **scouting table** like a sports manager: one row per unit (figure thumbnail,
  stage name, archetype badge, flow and confidence or ability power, abilities, age and
  seasons left, ask, salary), sortable by any column and filterable by role and archetype. A
  detail panel shows the selected unit big, with its ability text and record, and the bid
  input. Your open bids are marked in the table. Scouted units appear in their own section
  above the public list. The bidding round number and who is still shopping are shown at the top.
- **Lineup**: drag and drop units into the 3 MC slots, the 2 support slots and the bench,
  and release units.
- **League**: the division standings, the schedule and the other crews (with their units).
- **Hall of Fame**: the retired units' portraits and records.

The home screen is the hub's first tab, **Home**; the header above the tabs always shows the
crew's name and logo, wallet, payroll, season and round, and the next opponent as it stood at
the start of the round (its shop moves stay sealed until lock-in). A local league (M5) is one
player plus 3, 5, 7 or 11 bots, picked when founding the crew (T-023, D-075).

A big **Lock in** button is always visible once the bidding has ended. The title screen and
the lobby (host or join by room code) come before the hub, and a "while you were away"
summary (see [AI managers](#ai-managers)) shows there when it applies.

### Battle

**Side view, face-off** (D-050). The stage is seen from the side. Crew A stands on the left
facing right, crew B on the right facing left, each under a banner with its name and logo.
The front MCs stand at the mics in the middle, the other MCs queue behind them, and the
support units stand on a raised stoop behind their crew. The crowd is a row of heads along
the bottom, and each crew's hype meter sits above its half of the crowd. The crowd bounces
and waves more on the side with more hype.

```
  [CREW A  HYPE ######....]        [CREW B  HYPE ###.......]
      DJ  HM                                  PR  MG
   MC3  MC2  MC1   >> bars >>   MC1  MC2  MC3
  ===================== stage =====================
   o o o o o o o o o o o o o o o o o o o o o o o o   crowd
```

**Battle text** (pillar 3). Every hit shows a comic-style word ("BARS!", "OOF", "SNAP!",
"CHOKED!") and the damage number. Chokes, abilities and big hype swings (a change of at
least `BIG_HYPE_SWING = 3` in one turn) also get a short **one-liner** in a speech bubble,
filled from templates with stage names and crew names ("Waffle, your flow is stale!"). The
templates are invented, in the affectionate pun style of the stage names, and never quote
real lyrics. They are picked with a seed derived from the battle seed, so both peers see the
same lines. An ability shows its name in a banner over the unit that triggered it. The rival
front MC says the choke line (or the choking MC its last words, if its crew has no one on stage
to taunt it), the unit whose ability resolves says the ability line, and the crowd shouts the
hype swing line. The tables are in `src/render/text/` (T-054, D-073).

### Result screen

After the battle a **headline** in tabloid style ("MC WAFFLE ROASTS BIG PRETZEL!"), filled
from templates with the winner's and loser's names (D-050). Then:

1. the **MVP**: the MC with the most damage dealt in the battle (bars and disses, counting
   only confidence actually lost), with ties going to the winning crew and then to the earlier slot;
2. your xp gained, growth steps and newly learned abilities, and the win bonus due at the
   next upkeep;
3. the other battles of the round, one line each;
4. the updated standings.

### Sound

**In scope** (Q-010, D-051), built in M7 (T-030). All sound is **procedural WebAudio**, with no
audio files.

- **The beat**: one looping beat per battle, generated from a seed derived from the battle
  seed so both peers hear the same one. It **builds with hype**: layers come in as the two
  crews' total hype rises (kick, then snare, then hi-hats, then bass), and the beat drops out
  for one bar when an MC chokes.
- **SFX** for bars, disses, chokes, abilities, crowd cheers and boos, and the shop (bids,
  signings, lock-in). The market and hub have no music.
- **Default: on** at `DEFAULT_VOLUME = 0.4`. Mute and a volume slider are always visible, and
  the setting is saved in the browser. The first sound waits for the first click, as browsers
  require.

## 12. Still open

No design questions are open. Two technical questions remain for M6, in `plan/open-questions.md`:

- Q-015: what happens when two sittings play the same league at the same time and their saves fork?
- Q-009: is the free public PeerJS signalling server acceptable, or do we host our own?

Left to the balance pass (T-031), not open questions: the stat ranges and ability values, the
economy numbers, and the power 1 / 2 / 3 values of Studio Session, Voice Lessons and
Negotiator, where power 2 is the same as power 1 for now.
