# Release and playtest

How the game gets published, and how to check that a real sitting works between two networks.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs on every push to `master` (and by hand from the Actions
tab). It runs `make check` and `make build` and publishes `dist/` to GitHub Pages, so a tree
that fails its checks is never published (D-094). The build uses relative asset paths
(`base: './'` in `vite.config.ts`), so it works under the repo's sub-path.

One-time setup, in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   (Pages on a private repo needs a paid GitHub plan; otherwise make the repo public.)
2. Push to `master`, or run the **Deploy** workflow by hand.
3. The game is then at `https://robinstarkgraff.github.io/rap-battle/`. The workflow run
   shows the URL on its `deploy` job.

To try the production build locally: `make build`, then `npx vite preview` (port 4173).

## Two-network playtest

The browser tests play a sitting between tabs of one machine. Before submitting, play one
between **two different networks**, because that is where NAT traversal can fail.

Setup: two computers, one on a home or office network and one on a **phone hotspot** (a
mobile network is a different NAT and the typical hard case). Both open the Pages URL with no
`?peer=` setting, so they use the public PeerJS signalling server (D-078).

1. **A:** Start a league (4 crews), quit to the title screen, then *Host a sitting*. Note the 4-letter room code.
2. **B:** *Join a sitting*, type the code, found a crew. Both should see B's seat in the lobby.
   - "The signalling server can’t be reached" → the PeerJS server is blocked on that network.
   - "The connection timed out" (after 15 s) while hosting works → the peers found no path to
     each other (NAT). Note which networks; see TURN below.
3. **A:** Start the round. Both bid, lock in and watch the battle; both reach the result.
4. Continue to the lobby and play a second round.
5. **A (the host):** close the tab during the bidding of round 3. B is told the round didn't
   count (D-031). **B** now hosts from the title screen and **A** joins with the new code; the
   round is replayed from the last completed one, and the league is the same on both.

Write down, for each attempt: both networks (e.g. "home Wi-Fi ↔ mobile hotspot"), who hosted,
whether the join worked, and anything odd. Put the result in `plan/log.md` and in the known
issues list.

## TURN

Whether the game needs its own TURN relay is decided after the playtest (the user's choice).
What the game does today:

- With the public signalling server (the default), PeerJS's default ICE settings apply:
  Google's STUN server plus PeerJS's own free TURN relays (`eu-0`/`us-0.turn.peerjs.com`).
  So the default already has a best-effort relay for strict NATs, with no guarantee of
  uptime.
- `?peer=` with a secure (non-local) server keeps those same defaults. A local server
  (`localhost`, `127.0.0.1`) uses no ICE servers at all, for tests and LAN games.

If the playtest fails on a strict network even with those relays, the next step is a
`?turn=` setting that adds a TURN server the group provides (Q-022 lists the options).
