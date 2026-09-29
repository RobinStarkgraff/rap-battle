# Mic Drop League

A peer-to-peer multiplayer auto-battler for the browser, made for InnoJam: sign MCs and support
members at sealed-bid auctions, set your lineup, and watch your crew battle a friend's crew
automatically. Crews persist, grow, cost salary and age across the seasons of your friend
group's league. The rules are in [`docs/game-design.md`](docs/game-design.md).

**Play:** https://robinstarkgraff.github.io/rap-battle/ (desktop browser). Deploying and the
multiplayer playtest are described in [`docs/release.md`](docs/release.md), and the known
issues are in [`docs/known-issues.md`](docs/known-issues.md).

All code and art is AI-generated; the art is shapes drawn at runtime and the sound is
procedural WebAudio.

## Development

Needs Node 20.19 or newer.

| Command | Purpose |
|---|---|
| `make install` | install dependencies (`npm ci`) |
| `make dev` | Vite dev server on http://localhost:5173 |
| `make peer-server` | local PeerJS signalling server on port 9000 (open the game with `?peer=localhost:9000`) |
| `make check` | type check, lint, format check and unit tests |
| `make test-e2e` | Playwright browser tests (starts the dev server and a PeerJS server itself) |
| `make build` | type check and production build to `dist/` |

`CLAUDE.md` describes the architecture and code rules; `plan/` holds the roadmap, tasks and
decisions.

## Dev container

`.devcontainer/` is local to each machine and not in the repo (D-093). A dev container for
this project needs three project-specific additions on top of a plain Node 20 image:

1. **`node_modules` as a container-only volume** (D-015). On a macOS host the workspace is a
   bind mount, and Vite's bundler ships per-platform native bindings, so the host and the
   container each need their own install. Mount a named volume at `/workspace/node_modules`,
   create that directory as the container user in the image so the volume gets the right
   owner, and run `npm ci` after the container is created when it is empty.
2. **Chromium for Playwright baked into the image** (D-018), if the container's firewall
   blocks Playwright's browser download. At build time, run
   `npx playwright@<version> install --with-deps chromium` with the exact `@playwright/test`
   version from `package.json`, and set `PLAYWRIGHT_BROWSERS_PATH` to where it was installed.
   Rebuild the container after changing that version.
3. **A local PeerJS server for multiplayer** (D-078), if the firewall blocks `0.peerjs.com`:
   `make peer-server` and `?peer=localhost:9000`. Headless Chromium needs
   `--disable-features=WebRtcHideLocalIpsWithMdns` to connect two of its own tabs
   (`playwright.config.ts` sets it).

CI (`.github/workflows/ci.yml`) needs none of this: it has open network access.
