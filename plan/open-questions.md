# Open questions

Questions marked **blocking** have to be answered by the user before the milestone named
next to them can start. When a question is answered, move it to "Answered" and write the
answer down. If the answer is a decision, also add it to `decisions.md`.

## Open

### Game design
- Q-008 Should single-player against a bot or ghost crews be part of the final game, or only a way to test?
- Q-011 How do divisions work with a small friend group (e.g. 2–4 players)? One division
  until enough players join? Division size, rounds per season, how many move up or down.
  T-008 should propose tunable defaults; the user confirms.
- Q-012 Crews are saved locally, so a player could edit their save. Is that acceptable
  among friends, or should the host validate crews (e.g. salary cap, legal units)?

### Tech / scope
- Q-009 Is the free public PeerJS signalling server acceptable, or should we host our own?
- Q-010 Is sound in scope (procedural WebAudio), or should we cut it?
- Q-013 If the league host disconnects, does the session end, or does another peer take over as host?

## Answered

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
