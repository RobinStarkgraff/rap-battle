# Open questions

Questions marked **blocking** have to be answered by the user before the milestone named
next to them can start. When a question is answered, move it to "Answered" and write the
answer down. If the answer is a decision, also add it to `decisions.md`.

## Open

### Game design
(none)

### Tech / scope
- Q-015 Two sittings could play the same league at the same time (e.g. two pairs of colleagues
  host separately), so the saved league states fork at the same round number. Which copy wins,
  or can it be prevented (e.g. a lobby warns when another copy has the same round)? For M6 (T-036).
- Q-009 Is the free public PeerJS signalling server acceptable, or should we host our own?

## Answered

- **Q-018** Bots pad every division to the size of the largest one, rounded up to even, so
  all divisions play the same number of rounds and end the season together. (2026-09-29) → D-057
- **Q-010** Sound is in scope: procedural WebAudio with one seeded beat per battle that builds
  with hype, plus SFX. It starts on at low volume, with mute always visible. Built in M7 (T-030).
  (2026-09-29) → D-051
- **Q-016** Hype changes abilities only through a few **crowd abilities** whose value is taken
  from the hype (`⌊H / N⌋`). There is no global step or threshold trigger. A `hype` effect gains
  hype, and on rare occasions drains the enemy's. A `beforeBattle` trigger (Manager's Hometown
  Crowd) lets a battle start above 0 hype. (2026-09-28) → D-044, D-045
- **Q-017** The shop no longer has tiers, so progression comes from **value-based prices** and from units
  **growing** over their careers. The shop itself became a league-wide player market with sealed
  bidding rounds, personal scouting and no fixed slot count. (2026-09-28) → D-039 to D-042
- **Q-008** AI players are part of the real game, not only a test tool: persistent filler bots
  that play the real economy with a simple policy, and full stand-ins that manage absent
  players' crews. (2026-09-28) → D-030
- **Q-011** The §7 defaults are confirmed (divisions of up to 6, 3/1/0 points, 1 up / 1 down). There is one
  league per friend group (a pyramid like football) and one crew per player. Seasons are a double round robin
  that spans sittings. Bots keep division counts even, so there are no byes. (2026-09-28) → D-029
- **Q-012** Friends are trusted: schema validation only, with no crew legality check. (2026-09-28) → D-031
- **Q-013** The league state is copied to every member after each round, and any member can host. If the host
  drops mid-round, the round is voided and anyone re-hosts from the last completed round. (2026-09-28) → D-031
- **Q-014** No timer by default, and anyone can nudge. The host can turn on an optional shop timer
  (120 s); when it runs out, the current lineup is locked in. (2026-09-28) → D-032
- **Q-001** Jam: **InnoJam**, no fixed deadline, no theme or constraints mentioned. (2026-09-28)
- **Q-002** Platform: **desktop browser only**. (2026-09-28) → D-008
- **Q-003** Sport: **none**. It is not a sports manager; it is a **rap battle**. (2026-09-28) → D-007
- **Q-004** Battle resolution: the front MCs clash and the loser leaves the stage (Super
  Auto Pets style). Be ready to add other battle styles later. (2026-09-28) → D-010
- **Q-005** Meta layer: **stage positions** and **stamina / voice fatigue**. Also, the
  player drafts a **rapper + support crew**. Crew members have a **salary** and an **age**
  and retire at some point, which keeps power creep in check. (2026-09-28) → D-009, D-011, D-012
- **Q-006** Run structure: **ongoing championships with leagues and no end**. The league
  is a **session league among friends**: one peer hosts, and players are split into
  **divisions with promotion and relegation**. The crew is **persistent**: it carries over
  between battles and sessions. (2026-09-28) → D-012, D-013
- **Q-007** Crew shape: **3 MC slots + 2 support slots**, plus a small bench for resting
  tired units. (2026-09-28) → D-009
