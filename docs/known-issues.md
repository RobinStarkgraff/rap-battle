# Known issues

What doesn't work, or works in a limited way, in the released build. Each entry says why and
what a player can do about it. Update this list when an issue is fixed or found.

## Networking

- **Strict networks can block a sitting.** Signalling goes through the free public PeerJS
  server (D-078), and the connection between players through PeerJS's free STUN and TURN
  servers, with no guarantee of uptime. A network that blocks WebRTC or the signalling server
  (some corporate firewalls, some mobile networks) shows "The signalling server can't be
  reached" or "The connection timed out". Workaround: another network, or a group's own
  `peer` server with `?peer=<host>:<port>`. Whether the game needs its own TURN relay is
  decided after the two-network playtest (Q-022, T-059).
- **Not yet tested between two real networks.** The browser tests play sittings between tabs
  on one machine; the two-network playtest in `docs/release.md` is still open (T-059).
- **A host who leaves mid-round voids the round** (D-031). Everyone falls back to the last
  completed round, and anyone hosts again. Battles already played before the host left still
  count for those who saw them.
- **A lost connection is noticed after up to 45 s** (D-085). Closing or reloading the tab
  counts as leaving at once.
- **Joining during a round means watching.** A player who joins while a round runs sees the
  lobby until it is over, and plays from the next round.
- **Everyone must run the same version.** After a new deploy, players with an old tab open
  get "You and the host run different versions of the game" and have to reload.
- **Friends are trusted** (D-031). Messages are checked against their schemas, but crews
  aren't checked for legality, so a modified client could cheat.

## Saves

- **The league lives in the browser's storage only.** Clearing site data, a private window or
  another browser starts from nothing, and there is no export or import. Other members still
  have the league, but the player's claim on their crew is lost with the save, so they found
  a new crew (D-080).
- **One league per browser** (D-080). Joining another group's league replaces the saved one,
  after a confirmation.
- **A save from a newer version can't be opened by an older one.** Reload to get the newest
  build.

## Platform

- **Desktop only** (D-008). Mouse and keyboard; no touch controls or phone layout. The canvas
  scales to the window at a fixed 16:9.
- **Tested in Chromium only.** Firefox and Safari should work but haven't been tested.
- **Text input is basic.** Names and room codes are typed key by key on the canvas: no paste,
  no cursor, no input methods for other scripts.
- **The first sound waits for a click or key press**, as browsers require.
- **Download size**: one 1.6 MB script (440 kB gzipped), loaded before the title screen.

## Game

- **Balance comes from AI-played leagues** (T-031, D-090), not from human playtests yet.
  `make balance` prints the numbers.
