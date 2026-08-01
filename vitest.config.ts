import { defineConfig } from 'vitest/config';

// Pure-Node test environment — no DOM, no React. Tests in this project
// exercise business-logic helpers (rewards math, Zod schemas, the atomic
// order-completion claim). When a component test spec lands, that suite
// will get its own config with jsdom + the React plugin layered on top.
//
// `resolve.tsconfigPaths: true` is Vite's native replacement for the
// vite-tsconfig-paths plugin and resolves the `@/` aliases from
// tsconfig.json without any extra dependency.

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    // Pin a shop-zone default so a plain `vitest` run sits WEST of UTC. Date
    // bugs in this codebase are zone-shaped — a UTC-midnight calendar value
    // read with a local getter names the previous day west of UTC and the
    // right one east of it, so a suite running under UTC (which is what CI
    // runners default to) passes with the bug present. `npm run test:tz`
    // sweeps both sides; this keeps a single run from being silently blind.
    // Overridable, so that sweep can set its own zone.
    // `||`, not `??`: an exported-but-empty `TZ=` is a string, so `??` passed
    // it straight through and the runner resolved to UTC — silently losing the
    // very coverage this line exists to guarantee.
    env: { TZ: process.env.TZ || 'America/Los_Angeles' },
  },
});
