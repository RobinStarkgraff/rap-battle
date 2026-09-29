# Paper playtest 1 (T-051, 2026-09-29)

A hand-played test of `docs/game-design.md` as it stood after T-050. There were 2 crews in a
one-division league, so the season was 3 rounds long and round 3 also ran the season end.
Crew A was played by a "thoughtful" manager and crew B by the greedy AI policy from §7. Dice
rolls were made by hand. The gaps found and how they were settled are at the end; the rule
text is in `docs/game-design.md`.

## Attempt 1: the rules as written

- The start pool held 8 units (4 per member): 5 MCs and 3 supports, for 6 MC and 4 support slots.
- An average unit asks 4–6 and costs 2–3 salary, so a new crew needs about 8 gold per unit
  in round 1. With `STARTING_GOLD = 25`, crew A signed 3 MCs, had no support and 3 gold left.
- **Round 2:** income 10 (+2 for B's win). Each crew's 3 MCs already cost 8–9, so **neither crew
  could afford anyone**. The economy stalls, and a full crew of 5 (payroll about 13) can never
  be paid from 10 income.
- The first battle took 6 turns, and one MC choked to Battle Kid before any bar was dropped.

## Attempt 2: provisional economy, 3 rounds

This run used salary rounded down, income 12 and a start of 35. The numbers chosen afterwards
(income 16, start 40, salary unchanged) give the same rule coverage: round 1 fits 5 units
(about 24 in asks plus about 14 payroll).

| Round | Market | Battle | Result |
|---|---|---|---|
| 1 | All 8 pool units were bid on in the first bidding round; A won the one contested unit by bidding over the ask and lost a tie on another. B scouted and signed a 2/2 Battle Rapper. The pool was empty, so bidding round 2 ended with no bids | B opened. Headliner (B) hit all 3 A MCs in setup and choked A's 1-confidence Closer; Battle Kid (A) choked B's Opener in setup, and Get Up! buffed B's next MC. **3 turns** | B wins, margin 2 |
| 2 | 3 rookies. A bid on a Manager (Hometown Crowd). B bid on a Lyricist and released its Opener, who went straight back to the public list | A started with 1 hype. Battle Kid choked B's new 5/1 Opener in setup; Punchliner hit a back MC and choked it. **8 turns** | B wins |
| 3 | A released its farewell MC Dice to afford the released Battle Rapper. A bid 5 against B's 4, and B bought a Hype Man for the bench | Headliner choked B's Opener in setup again. Chart Topper and Drop the Beat built B's hype to 8; A's Closer came back with Battle Kid. **6 turns** | A wins |
| Season end | Dice retired from the public list. 5 units reached a growth step (2 MCs +1 stat, 3 supports +1 power). Ageing announced 2 farewell tours. Salaries were renegotiated (one rose 2 → 3) | – | B champion (6–3) |

## Gaps found and how they were settled

With the user (see `plan/decisions.md`):

1. **The economy stalls** (see above) → more income: `BASE_INCOME = 16`, `STARTING_GOLD = 40` (D-053).
2. **Battles are 3 to 8 turns long, not 12 to 24**, because flow ≈ confidence. Setup knockouts
   are common → short battles are accepted: the target is now 6 to 12 turns with more screen
   time per turn (D-054).
3. **Does an ability queued before its MC choked still resolve?** → yes (D-055).
4. **A released veteran retiring from the public list:** whose hall of fame? → every crew it played for (D-056).
5. **Q-018, divisions of different sizes** → bots pad every division to the same even size (D-057).
6. **The start pool is too thin, with 50/50 roles against 3:2 slots** → 6 per member, and roles
   are drawn 3:2 (D-058).

Clarified without a real alternative (D-059):

7. Rookies enter once per league round, not once per crew, and not in the league's first round.
8. Where a won unit goes: the first free active slot of its role, else the bench. The payroll check uses that placement.
9. Open bids must stay valid while the crew scouts, signs or arranges.
10. A released unit keeps its xp and `look`, and counts as the newest unit on the list. `POOL_MAX` is checked at upkeep only.
11. A diss gives hype once per ability, however many MCs it hits. A diss of 0 triggers no `hurt` and gives no hype.
12. Queue order after a bar: `barLanded`, then `hurt` or `choke`, then `takeFront`. Targets are picked at resolution. A multi-target hit is one effect per target.
13. A back MC that chokes leaves, and the others close up; nothing triggers `takeFront`. Positional targets of a choked MC use the place it held when it choked.
14. `takeFront` fires every time an MC becomes the front MC, never twice in setup. Each setup step runs the queue empty before the next.
15. The MVP counts confidence actually lost. Every season round is played. The result screen shows the win bonus, not "gold earned".
16. Scouting seeds include how often the crew has scouted this round.

For the AI manager (T-019): §7 doesn't define "best value" or how the AI orders its lineup.
Crew B put a 5/1 MC as its Opener and lost it in setup twice. T-019 should define both.
