# Session log

Newest first. Keep each entry to a few lines: what was done, what's next, any problems.

## 2026-09-29 (T-029, three-tab sitting test; M6 done)
- `e2e/sitting.spec.ts`: host and two friends in three contexts over a local PeerJS server started by `playwright.config.ts` (second web server, Chromium mDNS hiding off); `e2e/targets.ts` gained `waitForShown`. The market hides its submit button once a sitting's bids are in (D-087).
- The test takes about 3 minutes (three pages at 15 to 20 fps in the container); `make test-e2e` runs all three tests in 3 minutes with 3 workers.
- **M6 exit criteria**, checked one by one: PeerJS lobby where any member hosts with their saved league, guests join by code and the newest league wins ✓ (T-025, T-036, D-079); a zod-validated protocol with a version handshake ✓ (T-026); the host collects and resolves the bidding rounds, runs AI managers for bots and absent players and sends the league state after each round ✓ (T-036); battle seed agreement after lock-in and simultaneous lock-in ✓ (T-027); a result-hash check that detects desyncs ✓ (T-028); who is still shopping, nudges and the optional shop timer ✓ (T-053); disconnects (a host drop voids the round, a player drop locks the lineup) with feedback ✓ (T-028); a "while you were away" summary ✓ (T-036); a Playwright test with three tabs ✓ (T-029). `make check` (463 tests), `make build` and `make test-e2e` (3 tests) pass.
- **M6 is done; M7 is in progress.** Now: T-037, T-030, T-031. Not tested yet: P2P between two real networks over the public PeerJS server (that is T-032, M8).

## 2026-09-29 (T-053, who is shopping, nudges, shop timer)
- `src/net/`: `nudge`/`nudged` (host drops repeats within `NUDGE_GAP_MS`), `settings` (the host's timer), `timer` (time left for the running bidding round or lineup); the host's `setTimer`, `syncTimer` and `timeUp` (passes, then forced lock-ins with stand-in nonces); the client's `nudge`, `timerSeconds`, `timer` (D-086).
- `src/app/sitting.ts`: player statuses from the copy of the round, nudges, the timer toggle. `render/`: the hub's player strip with NUDGE buttons (`hub-nudge-<crew>`), the nudge notice, the countdown under Lock in, statuses in the lobby's seats, the lobby's SHOP TIMER switch (`lobby-timer`). T-030 now includes the nudge sound.
- Tests: nudges and their rate limit, the timer setting reaching everyone and late arrivals, a round finished by the timer alone (fake timers), statuses and nudges in the flow. Checked the lobby switch, the strip, the countdown and a nudge in two Chromium tabs.
- `make check` (463 tests) passes. **Next:** T-029 (Playwright multi-tab league test).

## 2026-09-29 (T-028, desyncs and disconnects)
- `src/net/`: `league` messages carry the league hash; client checks its result, reports `outOfSync`, asks for a `resync` when a copy breaks (host resends the round, or the last round and then the league); host force-locks a dropped player's crew with a stand-in nonce (or replaces its nonce) and sends `notice` (`playerLeft`, `outOfSync`); `frames.ts` heartbeats (`PEER_KEEP_ALIVE` 5 s / 45 s) for PeerJS links (D-085).
- `src/app/`: the round is saved as soon as its battles are played; a host drop before that shows `roundVoided`; the hub lists who left; `flow.shutdown()` on `pagehide`. New problem texts.
- Tests: heartbeat keep-alive and timeout (fake timers); a tampered hash is noticed and healed; a damaged op triggers a resync and the guest still plays its battle; a player who drops before or after locking in; the host dropping mid-round voids it and the guest can host again; a guest dropping lets the host play on.
- Checked in Chromium: the guest closes its tab mid-bidding, and the host can finish the round about 6 s later with the "left" line shown.
- `make check` (459 tests) passes. **Next:** T-053 (who is shopping, nudges, shop timer).

## 2026-09-29 (T-027, battle seed agreement)
- `src/net/sha256.ts` (tested against the FIPS vectors and WebCrypto), `nonce.ts`; lock-in ops (`lockIn`, `forceLockIn`, `aiLineup`) carry a commitment; `agreedSeeds` from the revealed nonces; host: stand-in nonces, `revealNonce` once every crew has locked in, checks and replaces bad nonces, `play` with the nonces; client: `lockIn()` draws the nonce, reveals it when asked, checks every nonce and reports `badNonce`. Core `agreedBattleSeed` (tested). Doc §3 step 4 describes it (D-084).
- Tests: seeds equal `agreedBattleSeed` of both crews' nonces with the host's for the bots; the reveal comes after the last lock-in; a lying guest's nonce is replaced and everyone still agrees; a nonce changed on the way is noticed.
- `make check` (452 tests) passes; the two-tab browser round still plays. **Next:** T-028 (desync check, disconnects).

## 2026-09-29 (T-036, the league host)
- `src/net/`: `ops.ts` (the round's ops and `applyOp`; sealed bids), `leagueHost.ts` (seats and claims, adoption of a newer copy, newcomers via `joinLeague`, rounds as ordered ops with the AI manager for every crew without a seated player, reveals, `play`, league snapshots, catch-up for late arrivals), `leagueClient.ts` (each player's copy; checks actions before sending; events for the app). The T-026 `hostSession`/`guestSession` became these. Protocol messages: `act`, `found`, `offerLeague`; `league`, `requestLeague`, `refusedAction`, `roundStart`, `op`, `play` (D-083).
- `src/core/`: `league/away.ts` (`awaySummary`, tested over a season end), `save/canonicalLeague` (sorted keys; a parsed save orders keys by schema, so plain JSON can't compare copies).
- `src/app/`: `sitting.ts` rewritten around host and client (the host plays through its own client over an in-memory link), `flow.ts` runs a local league or a sitting, `leagueStorage` remembers the player's crew (`savedCrewId`), `localLeague.playedRound` shared. `render/`: lobby info and away panel (`lobby/view.ts`, tested), founding in join mode with the replace warning, hub waiting line and LOCKED IN.
- Found on the way: `client?.act(action) ?? 'noRound'` turned a successful `null` into a refusal; client events before the app listens are now kept for it.
- Checked in two headless Chromium tabs over a local PeerJS server: host, guest founds a crew, round start, waiting line, passes, lock-ins, battles, results, the guest's save.
- `make check` (445 tests) passes. **Next:** T-027 (battle seed agreement).

## 2026-09-29 (T-026, message protocol and handshake)
- `src/net/protocol.ts` (messages and zod schemas, `PROTOCOL_VERSION = 1`), `handshake.ts` (`greetHost`, `awaitHello`, `welcomeGuest`, `refuseGuest`), `hostSession.ts` (seats, `seats` broadcast, `MAX_GUESTS`), `guestSession.ts`. `core/save` exports `crewIdentitySchema` for the protocol. Links now hand out every message asynchronously, so no message is lost between the handshake and the session (D-082).
- `app/sitting.ts` uses the sessions: the host names a guest's crew when its saved league is the host's; the guest tells the host its save. New refusal texts.
- Tests: messages round-trip and junk is refused; handshake success, version mismatch on both ends, refusal, silence, leaving; seats over three peers, a full sitting, leaving and the host closing. Checked the lobby in two headless Chromium tabs again.
- `make check` (429 tests) passes. **Next:** T-036 (the league host).

## 2026-09-29 (T-025, PeerJS wrapper and lobby)
- Answered Q-015 and Q-009 with the user before the M6 run, and how newcomers join (D-078 to D-080).
- `src/net/`: `link.ts` (`Link`, `HostRoom`, `Network`, `createLinkDriver` that keeps early messages), `frames.ts` (whole or numbered frames), `memoryNetwork.ts` (rooms in one process, async ordered delivery, `loseRoom`), `peerNetwork.ts` (PeerJS, raw strings, 15 s timeout), `roomCode.ts`, `peerServer.ts` (`?peer=`). Added `peerjs` and, for local runs and tests, the `peer` server (`make peer-server`) (D-081).
- `src/app/sitting.ts` (host a room with the saved league's crew, retry taken codes; join by code; host-left and connection errors), flow screens `join` and `lobby`; `render/`: title buttons HOST A SITTING / JOIN A SITTING, `JoinScene`, `LobbyScene` (code, seats, Start round, Leave), new problem texts.
- Checked in two headless Chromium contexts over a local PeerJS server: the host's lobby shows its code, the guest joins by typing it, the host sees the guest, and the guest is told when the host closes the sitting.
- `make check` (419 tests) and `make test-e2e` pass. **Next:** T-026 (message schemas and handshake).

## 2026-09-29 (T-024, Playwright round test; M5 done)
- `e2e/round.spec.ts` plays a whole round in Chromium through named targets (`e2e/targets.ts`, `e2e/window.d.ts`): founding with colours, logo and a 4-crew league, the hub tabs, bids 2 over the ask, passes until Lock in is enabled, won units in the lineup, lock-in, the battle at 2×, the saved round, round 2, and Continue after a reload. `?seed=` fixes the league seed (`src/app/seed.ts`, tested) (D-077).
- Found on the way: a disabled button still reported itself as enabled (only its look changed), so the test didn't pass the later bidding rounds; `setEnabled` now switches its input off too. A hall of fame portrait moved only the figure's body into the layer (drawn at the screen's corner); fixed. The result screen's MVP no longer shows a name plate over its heading.
- Checked a save two seasons in (made headlessly with AI managers) in the browser: titles, a season-end result (champions, a retirement, farewell tours) and a framed hall of fame portrait.
- **M5 exit criteria**, checked one by one: title screen ✓ (T-023); crew founding with name, colours and logo ✓ (T-023); a new local league with bots ✓ (T-023); the hub with Market (scouting table, bidding rounds, scouting) ✓ (T-021), Lineup (drag and drop, release) ✓ (T-021), League and Hall of Fame ✓ (T-023) and Lock in ✓ (T-023); the battle scene with tweens and battle text ✓ (T-022, T-054); the result screen with headline and MVP ✓ (T-023); paper-cut figures from the `look` seed and crew logos ✓ (T-020); the league saved in the browser ✓ (T-023); a Playwright test that clicks through one full round ✓ (T-024). `make check` (400 tests), `make build` and `make test-e2e` (2 tests) pass.
- **M5 is done; M6 is in progress.** Now: T-025, T-026, T-036. New M7 tasks: T-056 (onboarding hints), T-057 (hall of fame paging, figures in the league tab).

## 2026-09-29 (T-021, Market and Lineup tabs)
- `src/render/hub/marketView.ts` (tested: rows, role/archetype filters, sorting by every column with stable ties, draft bids pruned to listed units and checked with `bidsProblem`, stats and ability value texts), `marketTab.ts` (filters, sortable header, paged table with thumbnails and badges, scouting, detail panel, bid input, submit or pass), `lineupTab.ts` (drag and drop and click-then-place over MC, support and bench boxes, release bin, confirmed release, payroll). `art/unitFigure.ts` gained a baked `addBadge` (D-076).
- Checked in Chromium: bids on six units, submit, lineup shows the won units; dragging an MC onto an occupied bench place is refused (support can't swap into an MC slot), onto an empty one moves it and halves its salary.
- `make check` (398 tests) and `make test-e2e` pass. **Next:** T-024 (Playwright round test).

## 2026-09-29 (T-023, game flow, title, founding, hub, result)
- `src/app/`: `localLeague.ts` (`newLocalLeague`, `openRound` with the bots' first bids, `playerBids`, `lockInAndPlay` returning the player's battle with the locked-in crews), `flow.ts` (`createGameFlow`: title, founding, hub controller, battle, result, next round; saves after each completed round; explains damaged or blocked saves), `director.ts` (scene per screen), `main.ts` (all scenes, `window.micDropTargets`). Tests for both pure modules.
- `src/render/`: `scenes/TitleScene.ts`, `scenes/FoundingScene.ts` (typed name via `ui/textInput.ts`, colour and logo pickers, league size, live preview), `hub/HubScene.ts` with `homeTab.ts`, `leagueTab.ts`, `hallTab.ts` and first versions of `marketTab.ts` (pass only) and `lineupTab.ts`, `hub/view.ts` (tested), `result/ResultScene.ts` and `result/view.ts` (tested), `text/problems.ts` (refusal texts). BootScene removed.
- Core: `battleMvp`/`damageTable` (§11 MVP) and `lockInOrForce` (now also used by `playRound`), with tests. `GAME_TITLE` is *Mic Drop League*; the page title too.
- Found on the way: Phaser's `Container.getBounds` ignores `Graphics` children, so test targets use a container's origin. Headlines were reworded so no verb follows a crew name (D-075).
- Clicked through a whole round in Chromium (title, founding with colours and logo, hub tabs, three passes, lock-in, forfeit battle, result, round 2 with upkeep and the wallet cap). `make check` (393 tests) and `make test-e2e` pass. **Next:** T-021 (Market and Lineup tabs).

## 2026-09-29 (T-022, battle scene)
- `src/render/battle/`: `playback.ts` (`buildPlayback`: beats with durations, words, choke taunts, ability lines, crowd lines for swings of 3+, stage snapshots, tempo fitted to 30–60 s), `layout.ts` (stage positions), `BattleScene.ts` (backdrop, stoops and mics, banners with logos, figures with FLOW/CONF labels, hype meters, a crowd whose bounce follows the hype, lunges, hits, ability banners, speech bubbles, choke tumbles, move-ups, 2× speed, the winner panel, then `onDone`). `render/ui/`: `button.ts`, `bubble.ts` (speech bubbles, pop words), `targets.ts` (named buttons for browser tests). `art/bake.ts` bakes static art into textures (D-074). Doc §5 Pacing states the tempo rule.
- Found on the way: Phaser redraws `Graphics` shapes every frame, so the unbaked battle ran at about 7 fps in headless Chromium and its timers seemed to stall; baking fixed it. The container's software WebGL still tops out at about 15 to 20 fps, even for static scenes.
- Dev pages: `?battle=<seed>` plays demo battles between generated crews (`src/app/dev.ts`); checked by screenshots (setup choke, move-up, hype swing line, winner panel, about 55 s).
- `make check` (365 tests) and `make test-e2e` pass. **Next:** T-023 (game flow, title, founding, hub, result).

## 2026-09-29 (T-054, comedy text tables)
- `src/render/text/`: `template.ts` (`{slot}` templates, `fillTemplate` that refuses missing slots, `pickLine`), `battleText.ts` (hit words by damage, choke and buff words, choke taunts, last words, ability lines per effect kind, hype swing and drop lines, `battleTextRng`), `headlines.ts` (5 headline kinds, `headline()` in capitals from a seed derived from the battle seed) (D-073). Doc §11 says who says which line.
- Tests: every table uses only the slots it is given, fills without leftovers, names are inserted literally, seeded picks repeat, headlines fit 80 characters with the longest names.
- `make check` (355 tests) passes. **Next:** T-022 (battle scene).

## 2026-09-29 (T-020, procedural shape art)
- `src/render/art/`: `pen.ts` (the `Pen` drawing interface and shape helpers), `look.ts` (`rollLook`), `career.ts` (bling per growth step, chain weight, farewell), `figure.ts` (`drawFigure`), `icons.ts` (10 archetype icons and the badge), `logos.ts` (8 logos), `backdrop.ts` (sky, brick wall, mural, sidewalk, boombox), `lettering.ts` (outlined text styles), `unitFigure.ts` (figure + name plate + badge tooltip + farewell ribbon). `render/palette.ts` holds the crew colour hex values. `render/config.ts` now names the design resolution `DESIGN_WIDTH × DESIGN_HEIGHT` (D-072).
- Tests with a recording pen: every look stays in the figure box, looks are pinned and varied, bling and sash show, icons and logos stay in their circles and differ, the backdrop covers the screen.
- A dev-only art gallery at `http://localhost:5173/?gallery`; checked by screenshot.
- `make check` (332 tests) and `make test-e2e` pass. **Next:** T-054 (comedy text tables).

## 2026-09-29 (T-019, AI manager and the headless league; M4 done)
- `src/core/ai/`: `value.ts` (`strength`, `valueForMoney`, `slotFit`, `payrollWith`), `lineup.ts` (`planLineup` over the 6 MC orders, `movesFor`, `surplus`), `manager.ts` (`AI_MANAGER`: MC-first best-value bids with a seeded taste, one upgrade bid, payroll within `BASE_INCOME`, scouting for empty slots, arranging, surplus release, payroll trim). Doc §7 now defines best value and the lineup order (D-071).
- `headless.test.ts`: AI managers play 4 seasons of a 12-crew league (2 divisions) and 5 seasons of a 4-crew one through `playRound()`: titles every season, halls of fame, growth and second abilities, unique living ids and names, no crew without MCs, no turn-limit battles, save round trip, determinism.
- Found on the way, and fixed in the AI: a crew that lost every unit at a season end spent its wallet on a support and fielded no MC; and the forced lock-in, which releases the cheapest units first, stripped lineups to their stars.
- **Balance finding for T-031** (added to its text): active slots fill about 4.9 of 5 in season 1 but about 3 from season 3, because renegotiated salaries of grown units plus an ask don't fit under `WALLET_CAP = 20`. Battles averaged 5 to 6 turns, with 0 of 240 at the turn limit.
- **M4 exit criteria**, checked one by one: player market with stage names, supply, scouting, sealed bidding and release ✓ (T-016, T-017); arranging slots and bench ✓ (T-017); upkeep with income, `upkeep` abilities and the wallet cap ✓ (T-018); payroll at lock-in ✓ (T-017); growth and the second ability ✓ (T-018, seen in the headless run); season end with titles, halls of fame, ageing and salaries ✓ (T-018, T-034); divisions padded with bots, double round robin, standings, promotion and relegation, joining and leaving ✓ (T-034); the AI manager ✓ (T-019); one pure function for a whole round ✓ (T-055); a versioned, zod-validated save ✓ (T-035); a headless multi-season test ✓ (T-019). `make check` (313 tests), `make build` and `make test-e2e` pass.
- **M4 is done; M5 is in progress.** Now: T-020, T-021, T-022; Next: T-023, T-054, T-024.

## 2026-09-29 (T-035, league save)
- Added **zod 4** (`^4.6.5`). `src/core/save/`: `schema.ts` (`leagueSchema`, each part typed against its core type), `save.ts` (`serializeLeague`, `parseLeague` with the `format`/`version` envelope, `SAVE_VERSION = 1`, an empty `MIGRATIONS` table). `src/app/leagueStorage.ts`: `browserStore`, `saveLeague`, `loadLeague`, `deleteLeague` over a `KeyValueStore`.
- Tests: a league a season in round-trips; not-JSON, not-a-save, newer versions and six kinds of corrupt league are refused; the storage copes with a missing save, a broken save and blocked storage.
- CLAUDE.md: `core/` holds the save schema and may use zod (D-070).
- `make check` and `make build` pass. **Next:** T-019 (AI manager and the headless league test).

## 2026-09-29 (T-055, `playRound()`)
- `src/core/round/`: `start.ts` (`startRound`: upkeep with the win bonus, skipped for fresh crews and in the league's first round; rookies; `RoundState`; `takenNames`), `actions.ts` (the shop actions, `resolveBids`, `lockInCrew`, `forceLockInCrew`, `stillBidding`, `stillShopping`), `finish.ts` (`roundBattles`, `finishRound` with battle seeds from a callback, records, xp, results and the season end), `play.ts` (`CrewManager`, `IDLE_MANAGER`, `playRound`) (D-069).
- Tests: the first round without upkeep, upkeep and rookies later, newcomers, every refusal, payroll at lock-in, determinism, given seeds and a season end after 3 rounds.
- `make check` passes. **Next:** T-035 (league save format).

## 2026-09-29 (T-034, league rules)
- `src/core/league/`: `types.ts` (`League`, `Member`, `Division`, `Season`, `MatchResult`), `crews.ts` (`foundCrew`, `crewNameProblem`, `botIdentity`), `divisions.ts` (`divisionSizes`, `paddedSize`, `addBot`, `formDivisions`, `scheduleSeason`), `schedule.ts` (`doubleRoundRobin`), `standings.ts` (`divisionStandings`, `leagueRanking`, `seasonComplete`), `create.ts`, `membership.ts` (`joinLeague`, `leaveLeague`), `seasonEnd.ts` (`endSeason`: titles, retirement, ageing, salaries, promotion and relegation, new split with bots, new schedule).
- Doc: pairings shuffle the slots; head-to-head among all tied crews; which bot a newcomer replaces, and its units become free agents (D-068).
- `make check` passes. **Next:** T-055 (`playRound()`).

## 2026-09-29 (T-018, upkeep, battle results and the season end)
- `src/core/career/`: `upkeep.ts` (`upkeep()`: income + win bonus, `upkeep` abilities, wallet cap), `battleResult.ts` (`applyBattleResult()`: records, stints and 1 xp with growth for active units), `seasonEnd.ts` (`recordSeason`, `retireUnits` into every former crew's hall of fame, `ageUnits` with the new farewell tours, `renegotiateSalaries`). The league steps of the season end (standings, titles, divisions, schedule) come with T-034 and T-055.
- New seeds for bids, scouted signings, upkeep and growth in `core/seeds.ts` (D-067).
- `make check` passes. **Next:** T-034 (league rules).

## 2026-09-29 (T-017, bidding, signings and lock-in)
- `src/core/shop/`: `lineup.ts` (places, `freePlaceFor`, `moveUnit` with swaps, `payroll`), `signing.ts` (`signUnit` sets the salary, starts a stint and resolves `sign` abilities; `releaseUnit`), `bidding.ts` (`bidsProblem`, `resolveBidRound`, `afterBidRound`), `shopCrew.ts` (scout, sign scouted, release, move and bid, keeping open bids valid), `lockIn.ts` (`lockIn`, `forceLockIn`).
- Doc: bid resolution order and the fall-through to the next best bid; the forced lock-in releases by cost at lock-in (D-066).
- `make check` passes. **Next:** T-018 (upkeep, results and the season end).

## 2026-09-29 (T-016, player market)
- `src/core/market/`: `value.ts` (`rating` with the youth premium, `askPrice`, `salaryFor`, `benchSalary`, `seasonsLeft`, `onFarewellTour`), `generate.ts` (`generateUnit` with roles 3 : 2, weighted `rollAge`, `rollStageName`), `market.ts` (start pool, rookies with `POOL_MAX`, free agents), `scouting.ts` (`scout()`). `core/names.ts` (`uniqueName`, case-insensitive `nameSet`, also for bot crew names), `core/seeds.ts` (labelled seeds), `core/result.ts` (`Result` for refused player actions).
- Tests check the doc's rating examples, stat and age ranges, the 3 : 2 and age weights, unique names with numerals, the cap order, scouting cost, replacement and replay, and pin the first generated units.
- Doc: capped-out units don't enter a hall of fame; names are unique among living units (D-065).
- `make check` passes. **Next:** T-017 (bidding, signings, release, lock-in).

## 2026-09-29 (T-015, battle tests; M3 done)
- `src/core/battle/abilities.test.ts`: one case per ability (a `Record<AbilityId, …>`, so a new ability without a test fails to compile), incl. slot conditions, crowd values, `oncePerBattle`, random targets and the 4 out-of-battle abilities, plus two abilities in learned order.
- `src/core/battle/properties.test.ts`: 400 random battles plus 100 long ones (extra confidence) from `src/core/testing/randomLineup.ts`: same seed → same log, exactly one `end` naming a winner, turns alternate from the opener and stay within `MAX_TURNS`, end reason and margin match the stage replayed from the chokes, hype within 0–10, no bars by choked MCs, every end reason and all 28 in-battle abilities occur. One log is pinned as a snapshot.
- Observed: no ordinary random battle reached `MAX_TURNS`, which fits D-054's short battles.
- **M3 exit criteria**, checked one by one: seeded RNG ✓ (T-010); crew and unit model ✓ (T-011); data tables for 10 archetypes, 32 abilities, name lists and tunables ✓ (T-012); ability system with 8 triggers, conditions, fixed and hype values, 5 effects and targets ✓ (T-013); "front MCs clash" behind `BattleStyle` with alternating turns, hype meters and no-draw end rules ✓ (T-014); tests per ability, determinism and the one-winner property ✓ (T-015). `make check`, `make build` and `make test-e2e` pass.
- **M3 is done; M4 is in progress.** Now: T-016, T-017, T-018. T-023 now also covers setting `GAME_TITLE` to *Mic Drop League*.
- **Next:** T-016 (player market).

## 2026-09-29 (T-014, `simulateBattle()`)
- `src/core/battle/`: `state.ts` (battle state from the lineups), `fire.ts` (queues triggered abilities in resolution order, `oncePerBattle`), `stage.ts` (bars, disses, chokes, moving up, hype), `queue.ts` (FIFO queue, targets picked at resolution, ops applied one at a time), `frontMcsClash.ts` (setup, turns, turn-limit winner), `style.ts` (`BattleStyle`), `simulate.ts` (`simulateBattle`, `battleEnd`) (D-064).
- `frontMcsClash.test.ts`: a full hand-computed log, opener order, move-up, empty slots, margin, hype clamping, the three end rules, chains stopped at the end, setup step order, `takeFront` once after a setup choke, queue order after a bar, and D-055. Test helpers in `src/core/testing/battle.ts`.
- `make check` passes. **Next:** T-015 (per-ability, determinism and property tests).

## 2026-09-29 (T-013, ability system)
- `src/core/abilities/`: `amount.ts` (value by power plus `⌊H / N⌋`), `triggers.ts` (`triggersOn`, `slotConditionMet`), `targets.ts` (the 12 friend and enemy target functions over a `TargetView`, incl. a choked MC's place), `effects.ts` (the 5 named effect functions returning `EffectOp`s), `outOfBattle.ts` (`applySignAbilities`, `applyUpkeepAbilities` with `CrewEvent`s). `src/core/growth.ts`: `gainXp()` (D-063). `oncePerBattle` is battle state and comes with T-014.
- Tests for each module; `docs/game-design.md` §9 now says `friend` is any *other* friendly MC.
- `make check` passes. **Next:** T-014 (`simulateBattle()`).

## 2026-09-29 (T-012, data tables)
- `src/core/data/abilities.ts` (32 abilities with UI text), `archetypes.ts` (5 MC + 5 support, stat ranges, pools, name prefixes and words), `names.ts` (shared stage name lists, bot crew adjectives and nouns, colour and logo display names), `src/core/tunables.ts` (all of §10 as `TUNABLES`).
- `data.test.ts`: every trigger, subject per MC trigger, slot condition, target and effect is used; pools have 4 abilities of their role incl. the shared one; MC abilities have one value; `hurt` disses are `oncePerBattle`; name lists have no duplicates. New `tooling/game-design-doc.test.ts` checks the doc's §10 table against `TUNABLES`.
- Noted: `CREW_NAME_MAX = 20` applies to typed names only; generated bot names reach 24 characters (*The Unstoppable Mixtapes*), which the render work (T-020, T-023) must fit.
- `make check` passes. **Next:** T-013 (ability system).

## 2026-09-29 (T-011, core types)
- `src/core/model/`: `ability.ts` (ids, triggers, subjects, `inSlot`/`oncePerBattle`, targets, `Amount`, the 5 effects, `AbilityDef`), `archetype.ts`, `unit.ts` (`McUnit | SupportUnit`, learned abilities, `record` with crew stints), `crew.ts` (identity, slots, bench, wallet, hall of fame, record, `BattleLineup`), `battleEvent.ts` (`BattleEvent` union), `crewUnits.ts` (active/all units, find, replace) (D-062).
- `src/core/testing/fixtures.ts`: `mc()`, `support()`, `crew()` builders for tests. `model.test.ts` covers the id lists, type-level shapes and the crew helpers.
- `make check` passes. **Next:** T-012 (data tables).

## 2026-09-29 (T-010, seeded PRNG; M3 started)
- `src/core/rng.ts`: mulberry32 `createRng()` with `next`, `int`, `chance`, `pick`, `weightedIndex`, `shuffle` and `fork(label)`, plus `deriveSeed(seed, ...labels)` (D-061). 15 tests in `rng.test.ts`, including pinned reference outputs. Exported from `core/index.ts`.
- `make check` passes. M3 is **in progress**.
- **Next:** T-011 (core types).

## 2026-09-29 (T-052, design wrap-up; M2 done)
- Consistency pass over `docs/game-design.md`, now marked **v1**. Added a crew state table (wallet, hall of fame, a crew `record` for titles), one league-wide season-end order in §7, the league, season and battle seeds, xp from abilities, `NAME_REROLLS`, and a §12 that lists what is left to T-031. Dropped the unused `allCrewMCs` target. No new game rules (D-060).
- `roadmap.md`: M2 is **done**. The M3 to M7 exit criteria now match the design (the M5 shop scene still said "buy, sell, roll, freeze").
- `tasks.md`: T-011 to T-014, T-016 to T-019, T-023, T-024, T-027, T-031, T-034 to T-036 reworded; new **T-055** `playRound()` (M4); T-012 moved into Now.
- **Next:** M3 with T-010 (seeded PRNG).

## 2026-09-29 (T-051, paper playtest)
- Played a 2-crew league by hand from `docs/game-design.md`: 3 rounds plus the season end, with crew B run by the greedy AI policy. The record is in `docs/playtest-1.md`.
- **Economy stalled** as written: 25 gold couldn't pay for a first lineup plus its payroll, and 10 income couldn't carry 5 salaries. The user chose more income: `BASE_INCOME = 16`, `STARTING_GOLD = 40` (D-053).
- **Battles ran 3 to 8 turns** (the target was 12 to 24), with frequent knockouts in setup. The user **accepted short battles**: the target is now 6 to 12 turns with more screen time per turn (D-054).
- The user's answers: queued abilities of a choked MC still resolve (D-055, against the recommendation); retirees enter the hall of fame of **every** crew they played for, including releases retiring from the pool (D-056); **Q-018:** bots pad every division to one even size (D-057); the start pool is 6 per member, with roles drawn 3 : 2 (D-058). 10 more gaps were clarified without a real alternative (D-059), among them rookies per league round, won-unit placement, queue order after a bar and diss hype once per ability.
- T-014, T-019 and T-034 were reworded. No open design questions are left; only Q-015 and Q-009 (tech) remain. `make check` passes.
- **Next:** T-052 (design wrap-up), then M3 with T-010.

## 2026-09-29 (T-050, design session 7: presentation)
- Ran design session 7 with the user over four rounds of questions. Added `docs/game-design.md` §11 **Presentation** (title, look, screens, battle, result screen, sound) and a **Crew identity** section in §2, added `look` to the unit state and `CREW_NAME_MAX` to the tunables; "Still open" is now §12.
- **Title: Mic Drop League** (D-048); CLAUDE.md updated.
- **Look:** a 90s block party (the user chose it over the recommended neon club) with chunky paper-cut figures. Looks are **fully random** from a new `Unit.look` seed with no link to the archetype, so the archetype shows as an icon badge by the name plate. Bling per growth step, grey hair and a sash in the farewell season, and framed hall-of-fame portraits (D-049).
- **Screens:** a home hub with Market / Lineup / League / Hall of Fame tabs; a side-view face-off battle; the market is a **sortable scouting table** (the user chose it over cards); comic words plus seeded one-liners; a tabloid headline result screen with an MVP (D-050).
- **Sound (Q-010 answered):** one seeded procedural beat that builds with hype, plus SFX, on at 40% by default (D-051). **Crew identity:** a typed name, two colours and a logo; bots get *The ⟨adjective⟩ ⟨noun⟩* names (D-052).
- T-011, T-012, T-016, T-020 to T-023, T-030 and T-034 were reworded; new T-054 (comedy text tables). T-010 moved into Now.
- **Next:** T-051 (paper playtest).

## 2026-09-28 (T-049, design session 6: roster and abilities)
- Ran design session 6 with the user over three rounds of questions. Rewrote `docs/game-design.md` §8 (archetypes, 32 abilities, stage names) and §9 (8 triggers, conditions, values, 5 effects, targets), and updated §2, §3 (upkeep order), §4 (rating), §5 (setup, hype meter), §5.1, §10 and §11.
- **5 MC archetypes** (Lyricist, Battle Rapper, Storyteller, Freestyler, Hitmaker) with their own stat ranges and **5 support archetypes** (DJ, Hype Man, Producer, Vocal Coach, Manager). Each pool has 3 signature abilities plus one shared ability per role. Stats first, abilities spice (D-043).
- **Q-016 answered:** `hypeBonus` and `HYPE_STEP` are gone. A few crowd abilities take their value from the hype (`⌊H / N⌋`), a `hype` effect gains hype or rarely drains it, and a `beforeBattle` trigger lets Hometown Crowd start a battle above 0. There is no threshold trigger (D-044).
- New ability-model pieces: the `hype`, `gold` and `xp` effects; `friend` subjects for `takeFront` and `hurt`; new targets; `oncePerBattle` (Clapback can't ping-pong). The Manager's Negotiator brings gold back, small and capped; upkeep now runs income → abilities → cap. `upkeep` is used by 3 abilities, and Vocal Coach has real abilities (D-045).
- **Youth premium:** rating +⌊seasons left / 2⌋ (D-046). **Stage names:** an optional prefix + a punny word from shared and per-archetype lists, unique per league, with no real artists (D-047).
- T-012, T-013, T-016 and T-018 were reworded, and T-052 moved into Now. The paper playtest (T-051) should look at Drop the Beat stacking on every bar and at Studio Session speeding up second abilities.
- **Next:** T-050 (presentation).

## 2026-09-28 (T-048, design session 5: shop and progression)
- Ran design session 5 with the user over four rounds of questions. The user turned the shop into a **sports-manager transfer market**. Rewrote `docs/game-design.md` §4 (now "the player market"), §2 unit state, §3, §5.1, §6, §8 (now archetypes and an ability pool) and §9–§10, and updated CLAUDE.md (concept and the network rule).
- **Unique units** generated from archetypes, in **one league-wide public list** fed by rookies each upkeep and by released free agents (D-039). This answers Q-017: progression comes from value-based prices and growth.
- **Sealed bidding rounds** (up to 3 per shop phase): the highest bid wins and plays this round, and ties go to the lower-ranked crew. **Scouting** costs 1 gold for 2 private units at their ask, which vanish if unsigned. No freeze (D-040). The host resolves the bids, which widens D-031 again.
- **No merging or levels.** +1 xp per battle played; every 3 xp is +1 stat (MC) or +1 ability power (support); a random second ability at 12 xp. No youth boost (D-041).
- **Value-based ask and salary**, renegotiated at each season end; releasing and retiring pay nothing; `STARTING_GOLD = 25` (D-042). All formulas are placeholders for T-049 and T-031.
- T-011 to T-013, T-016 to T-019, T-021, T-036, T-049 and T-053 were reworded, and the M4 exit criteria were updated. Not checked yet: whether 3 bidding rounds make sittings too slow. The paper playtest (T-051) should look at that.
- **Next:** T-049 (archetypes and abilities).

## 2026-09-28 (T-047, design session 4: crew management)
- Ran design session 4 with the user over four rounds of questions. Rewrote `docs/game-design.md` §6 and §5.1 (salary; the old §5.1 stamina section is gone) and updated §1–§4, §7–§11.
- **Stamina is cut** (D-036), which changes the user's own Q-005 answer: no tiredness, no bench recovery, no `restoreStamina` effect. The bench is storage at half salary and grows to 3 slots. Vocal Coach gets a placeholder `battleStart` warm-up; no unit uses `upkeep` until T-049.
- **No unit tiers anywhere** (D-037): the shop draws from the whole roster, and salary is a per-unit base salary plus level (the old tiers are placeholder salaries). `SHOP_SLOTS = 5` is a placeholder; progression without tiers is the new Q-017 for T-048.
- **Age in years, one season = one year** (D-038): the signing age is seeded between 18 and the retirement age − 1, weighted towards young. MCs retire at 23 and support units at 25 (known, global), after a one-season farewell tour; retirement and ageing run at the season end. Retirees go into a crew hall of fame. Age affects nothing else. The user first picked a hidden seeded window, then went with this instead.
- New Q-018 (divisions of different sizes have different season lengths, but the season end is league-wide), for T-051/T-052. T-011, T-016, T-018, T-048 and T-049 were reworded, and the M4 exit criteria in `roadmap.md` now leave out stamina and tiers.
- **Next:** T-048 (shop and progression).

## 2026-09-28 (T-046, design session 3: the battle)
- Ran design session 3 with the user over three rounds of questions and rewrote `docs/game-design.md` §5 (setup, turns, hype meter, end, pacing). §8 to §10 were updated to match.
- The front MCs now **take turns** in strict alternation, with a seeded opener and no compensation (D-033); D-022 is superseded. `MAX_TURNS = 40` replaces `MAX_EXCHANGES`. Playback targets 30 to 60 s, with a 2× speed button and no skip. Stage positions stay ability conditions only.
- **Hype meter** per crew (0 to 10) from bars, disses and chokes. Each ability scales by its own `hypeBonus` per 5 hype (D-034). The roster gets a placeholder hype bonus column. "Hype damage" is renamed to "damage".
- **No draws** (D-035): the first crew wiped out loses, and at the turn limit the crew that lost more confidence loses. One battle per match, and `POINTS_DRAW` is removed. The user first wanted several battles per match, then changed their mind.
- New Q-016 (hype effects and triggers, and `battleStart` abilities always seeing 0 hype), for T-049. T-013, T-014, T-015, T-022 and T-049 were reworded.
- **Next:** T-047 (crew management).

## 2026-09-28 (T-045, design session 2: core loop, persistence and league)
- Ran design session 2 with the user over four rounds of questions. Rewrote `docs/game-design.md` §7 and updated §1, §3, §6, §10 and §11.
- **One league per friend group** (a football-style pyramid of divisions) and **one crew per player**. Seasons are a **double round robin** that spans sittings. The Q-011 defaults are confirmed (D-029). Divisions are kept even with auto-added bots, so there are no byes and `POINTS_BYE` is removed. Rep seeding is gone.
- **AI managers** are part of the game: persistent greedy filler bots, and full stand-ins for absent players. A newcomer can take over a bot's slot mid-season (D-030).
- The **league state** (including every crew) is the save, copied to all members after each round. Any member can host. A host drop voids the round. Friends are trusted: schema validation only (D-031). There's **no timer by default**, plus nudges and an optional host timer that locks the current lineup (D-032).
- Q-008, Q-011, Q-012, Q-013 and Q-014 are answered. There's a new Q-015 (forked league saves, for M6). T-019, T-028, T-034, T-035 and T-036 were reworded to match, and T-053 was added (timer and nudge). CLAUDE.md now describes the league and the network rule. The M4–M6 exit criteria in `roadmap.md` still say "session league / crew save / vs bot"; T-052 updates them.
- **Next:** T-046 (the battle).

## 2026-09-28 (T-044, design session 1: vision and pillars)
- Ran design session 1 with the user over three rounds of questions. Added a **Pillars** section at the top of `docs/game-design.md`. The fantasy is the label boss, the tone is affectionate comedy, and the players are 2–6 colleagues in breaks, with no target session length. The pillars are crew attachment, clever combos, and watchable, funny battles. The game is skill-led with some luck, and the shop has no timer. Non-goals: not a rhythm game, no real rappers or lyrics, not a grindy F2P game (D-026).
- "Let it snowball": catch-up gold is removed from §3, §7 and the tunables, while ageing, retirement and divisions stay (D-027). Owned units get a `stageName` and a `record` (D-028), and T-011 is updated to match.
- New question Q-014 (slow or absent players with no shop timer), for T-045. `make check` passes.
- **Next:** T-045 (core loop, persistence and league).

## 2026-09-28 (new milestone M2: design iteration)
- The user asked for a milestone that works through the design together with them, from the broad view to the details. Added **M2: Design iteration with the user** (method and exit criteria in `roadmap.md`) with nine tasks: T-044 to T-050 are design sessions (vision → loop and league → battle → crew management → shop → roster → presentation), T-051 is a paper playtest and T-052 a wrap-up.
- Renumbered the later milestones: the old M2–M7 are now M3–M8 (D-025). **Log entries below this one use the old numbers.** T-043 (confirm Q-011) is folded into T-045.
- M2 is **in progress**; M3 (battle sim) is **not started** again.
- **Next:** T-044 (vision and pillars). The design sessions are conversations, so run them with `/next-task` one at a time.

## 2026-09-28 (T-009, M1 finished)
- Added the starting roster to `docs/game-design.md` §8: 11 units (7 MCs and 4 support units across 3 tiers) with base stats and L1/L2/L3 ability values. Added the ability model in §9: 7 trigger types, a position condition, 3 effects, the targets, and a rule that keeps the ability queue finite (D-024). Every trigger and both position conditions are used by at least one unit.
- Made "stage position" precise: it is the locked-in slot and doesn't change when MCs move up.
- `make check` passes (30 tests).
- **M1 is done.** Every exit criterion is met by `docs/game-design.md` (§3 round structure, §5 battle, §2 positions, §5.1 stamina, §5.2 salary, §6 age and retirement, §3–§4 economy, §7 league, §8 roster, all numbers named tunables). Q-011 (league defaults) still needs the user's confirmation (T-043, before T-034). **M2 is now in progress.**
- `/milestone M1` ran T-008 and T-009 without committing.
- **Next:** T-010 (seeded PRNG), T-011 (core types), T-012 (data tables).

## 2026-09-28 (T-008)
- Wrote `docs/game-design.md`: crew and unit state, round flow (upkeep → shop → lock-in → battle → result), shop and merging, the front-MC clash battle (simultaneous exchanges, trigger order, FIFO ability queue, exchange limit), stamina and bench rest, salary, age and retirement, the league, and a tunables table. Every number is a named tunable.
- Decisions D-020 (persistent wallet, payroll at lock-in), D-021 (stamina model), D-022 (battle resolution order) and D-023 (retirement age by tier).
- Q-011: the league defaults are proposed in §7 and need the user's confirmation (follow-up T-043, before T-034). `make check` passes (30 tests).
- **Next:** T-009 (starting roster and trigger types).

## 2026-09-28 (T-042)
- The repo is public, so I checked CI through the GitHub REST API with `curl` (no `gh` needed). CI run #1 (51c5172) and run #2 (a4881ac) both passed: in the `check` job, `make install`, `make check` and `make build` passed; in the `e2e` job, the Chromium install and `make test-e2e` passed. `make check` passes locally (30 tests).
- **M0 is done.** Every exit criterion is met.
- **Next:** T-008 (M1 design doc), then T-009 (roster).

## 2026-09-28 (T-038)
- The user rebuilt the container. Chromium 1243 is in `/opt/ms-playwright` and `PLAYWRIGHT_BROWSERS_PATH` is set. `make test-e2e` passes (the smoke test sees the Phaser canvas and no console errors), and `make check` passes (30 tests).
- All M0 exit criteria are now met. M0 stays **in progress** only until T-042 (confirm CI is green).
- `origin/master` already has 51c5172, so the M0 commits are pushed. I could not check the CI result, because `gh` is not in the container.
- **Next:** T-042 (the user checks the Actions tab), then T-008 (M1 design doc).

## 2026-09-28 (M0 run wrap-up)
- `/milestone M0 --commit` worked through T-004, T-038, T-005, T-039, T-040, T-006 and T-007.
- Exit criteria: `make check`, `make dev` and `make build` work, and `core/`'s `clamp()` has passing tests. **Not met yet:** `make test-e2e`, and seeing the Phaser scene draw in a browser (the smoke test covers it). Both wait for the container rebuild (T-038).
- M0 stays **in progress**. Open: T-038 (the user runs `make dev-rebuild`, then `make test-e2e`) and T-042 (push, and confirm CI is green). After that, M0 can be closed.
- **Next:** T-038 and T-042 (user actions), then T-008 (M1 design doc).

## 2026-09-28 (T-007)
- Added `.github/workflows/ci.yml` (D-019). The `check` job runs `make install`, `make check` and `make build`; the `e2e` job installs Chromium and runs `make test-e2e`, and uploads the Playwright results when it fails. Node 20, npm cache, actions v7 (the latest releases).
- Verified locally: the YAML parses, and a fresh clone passes `make install`, `make check` (30 tests) and `make build`. The workflow itself has not run yet, because nothing has been pushed. Follow-up T-042: push, and confirm CI is green.
- **Next:** milestone wrap-up.

## 2026-09-28 (T-006)
- Rewrote `.gitignore`: removed the leftovers from another project (`public/` comments, `deploy.log`) and the duplicate entries, grouped the rest, and added `coverage/`, `test-results/`, `playwright-report/`, `blob-report/`, `.vscode/` and `*.log`. `.devcontainer/` stays ignored (D-015, D-018); T-041 asks whether `.devcontainer/project/` should be committed. `git status --ignored` shows only the expected paths.
- **Next:** T-007 (CI).

## 2026-09-28 (T-040)
- Added `tsconfig.core.json` (only the ES2022 lib, no `types`) as a third project reference, so `tsc -b` also checks `src/core/` without DOM or Node types. A probe file that used `HTMLElement` and `KeyboardEvent` failed with TS2304, as intended. Vitest's types work without DOM, so the core tests still type-check. Recorded in D-017.
- `make check` and `make build` pass.
- **Next:** T-006 (`.gitignore`), T-007 (CI).

## 2026-09-28 (T-039)
- Added `tooling/eslint-boundaries.test.ts`: it lints 25 snippets through the ESLint Node API as if they lived in `src/{core,net,render,app}` and checks which boundary rule fires (20 forbidden cases, 5 allowed ones). Type-aware rules are switched off for the snippets, because they are not real files.
- `tooling/` is covered by `tsconfig.node.json` and by the Vitest `include`. Mutation check: removing `Date` from the core globals and `render` from the net layer rule made exactly those 3 cases fail.
- `make check` passes (30 tests).
- **Next:** T-040 (core tsconfig without DOM), T-006 (`.gitignore`).

## 2026-09-28 (T-005)
- Added the project targets `install`, `dev`, `check`, `test`, `test-e2e`, `build` and `format` to the existing `Makefile`. Each one calls the matching npm script. The devcontainer targets are unchanged, `make help` lists both groups, and no names clash with the included `dev-*.mk` files.
- Filled in the Commands section of CLAUDE.md and added the Chromium and clock-skew notes to Environment notes.
- `make check` and `make build` pass. `make dev` serves the page and `main.ts` (HTTP 200). `make test-e2e` still needs the container rebuild from T-038.
- **Next:** T-039 (lint rule regression tests), T-040 (core tsconfig without DOM).

## 2026-09-28 (T-038, in progress)
- The user chose to bake Chromium into the image (D-018). Added a build step to `.devcontainer/project/Dockerfile.project`: it reads the pinned `@playwright/test` version from `package.json`, installs Chromium with its system libraries into `/opt/ms-playwright`, and sets `PLAYWRIGHT_BROWSERS_PATH`. I tested the version extraction in `sh`, and `make dev-custom-validate` passes. The real Docker build can't run from inside the container.
- **Waiting for the user:** run `make dev-rebuild` on the host, then `npm run test:e2e` (or `make test-e2e` after T-005) in the new container. T-038 stays `[~]` until the smoke test passes.
- **Next:** T-005 (Makefile).

## 2026-09-28 (T-004)
- Added Vitest 4 (Vitest 5 needs Node 22) and Playwright 1.63, pinned exactly (D-017). First `core/` test: `clamp()` in `src/core/math.ts`, 5 tests. Playwright smoke test `e2e/smoke.spec.ts` loads the page and checks that the Phaser canvas is visible and that no errors are logged. `playwright.config.ts` starts `npm run dev`.
- Split the tsconfig into project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for configs and `e2e/`, and a shared `tsconfig.base.json`). `typecheck` is now `tsc -b`. New npm scripts: `test`, `test:watch`, `test:e2e`; `check` now runs the unit tests too.
- `npm run check` and `npm run build` pass. `npm run test:e2e` fails as expected, because Chromium can't be downloaded yet. T-038 verifies it after the container rebuild.
- **Next:** T-038 (bake Chromium into the image), then T-005 (Makefile).

## 2026-09-28 (tooling)
- Added the `/milestone [M#] [--commit]` skill (`.claude/skills/milestone/SKILL.md`). It works through all open tasks of one milestone in a single run, reusing the per-task steps from `/next-task`. Tasks marked "Optional" are always included. No task ID; `tasks.md` is unchanged.

## 2026-09-28 (T-003)
- Added ESLint 10 + typescript-eslint 8 (strict and stylistic, type-checked), Prettier 3 and eslint-config-prettier (D-016). New files: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`. New npm scripts: `lint`, `lint:fix`, `format`, `format:check`, `check` (typecheck + lint + format; T-005 will make `make check` call it).
- Boundary rules for each layer in `eslint.config.js`. I checked them with throwaway probe files: all 13 planted violations were reported (Phaser/render/app imports in core, `Math.random`, `Date`, `document`, `setTimeout`, `globalThis`, render↔net cross-imports, peerjs in render, phaser in net), and `../core` imports stayed allowed.
- Prettier reformatted one long line in `render/BootScene.ts`. `npm run check` and `npm run build` pass.
- Follow-ups: T-039 (automated regression test for the boundary rules, once Vitest exists) and T-040 (a core-only tsconfig without the DOM lib, because the lint rule does not block DOM *types*).
- **Next:** T-004 (Vitest + Playwright). Playwright still needs T-038.

## 2026-09-28 (T-002)
- Scaffolded Vite 8 + TypeScript 5.9 (strict plus extra flags) + Phaser 3.90 (D-014). Layout: `src/{core,net,render,app}`; `app/main.ts` starts Phaser with a `render/BootScene` that draws a stage, a spotlight and a mic from shapes, and shows `core`'s `GAME_TITLE`.
- `tsc --noEmit` and `npm run build` pass. The dev server serves the page and modules (HTTP 200). I set the chunk warning limit to 1500 kB because Phaser alone is about 1.2 MB.
- Added `node_modules/` and `dist/` to `.gitignore`; the rest of the cleanup stays in T-006.
- **Problem:** there is no browser in the container, and the firewall blocks `npx playwright install chromium`, so I couldn't confirm the scene visually. Added T-038, which T-004 needs.
- `npm run build` on the macOS host failed: no `@rolldown/binding-darwin-arm64`, because `node_modules` was installed from the Linux container. Fixed with a container-only `node_modules` volume (D-015). This needs a container rebuild, and `.devcontainer/` is gitignored, so the change is local only.
- **Next:** T-003 (ESLint/Prettier and the boundary rule).

## 2026-09-28 (T-001)
- Question session with the user. Q-001 to Q-007 answered and recorded as D-007 to D-013.
- **Big change:** the game is a **rap battle crew manager**, not a sports manager. The crew is 3 MCs + 2 support + a bench; front MCs clash (with more battle styles possible later); stage positions and stamina matter; crews persist and have salary, age and retirement; a session league among friends has divisions with promotion.
- Rewrote the tasks, roadmap (M1 in progress; M2, M3 and M5 rescoped) and CLAUDE.md for the new concept. Added T-034 to T-037 and the new open questions Q-011 to Q-013.
- **Next:** the M0 scaffold (T-002 to T-004). After that, T-008 writes the design doc.

## 2026-09-28
- Chose the tech stack (D-001 to D-006) and wrote the CLAUDE.md, roadmap and task backlog.
- No code yet.
- **Next:** the user answers the blocking questions Q-001 to Q-006 (T-001). The M0 scaffold (T-002, T-003) can start at the same time.
- Note: `.gitignore` still has entries from another project (T-006).
