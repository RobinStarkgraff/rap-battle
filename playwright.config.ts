import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://localhost:${String(PORT)}`;
/** The local PeerJS signalling server for the multiplayer tests (D-078); pages use `?peer=`. */
const PEER_PORT = 9000;
const isCI = Boolean(process.env['CI']);

/** End-to-end tests against the Vite dev server. Unit tests use Vitest instead. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium hides local addresses behind mDNS names, which its own tabs can't resolve
        // in a container or on CI, so peers in two tabs could never connect.
        launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] },
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: `npx peerjs --port ${String(PEER_PORT)}`,
      port: PEER_PORT,
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
  ],
});
