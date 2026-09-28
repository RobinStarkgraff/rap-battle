/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the static build works from any sub-path (itch.io, Pages).
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Phaser alone is ~1.2 MB minified; one vendor chunk is fine for a jam game.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    // Unit tests sit next to the code they test. Browser tests live in e2e/ (Playwright).
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
