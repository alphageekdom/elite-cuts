import { defineConfig } from 'vitest/config';

// Pure-Node test environment — no DOM, and nothing renders. Tests in this
// project exercise plain functions: business-logic helpers (rewards math, Zod
// schemas, the atomic order-completion claim) and, since 2026-08-04, module
// functions that happen to live beside a hook (`useRewardsStanding`'s cache).
//
// That last case means React *is* in the module graph — importing a
// `'use client'` module pulls it in — so the old "no React" here is no longer
// true. It loads fine and nothing calls it.
//
// `environment: 'node'` is the DEFAULT, not the rule. A file that needs a DOM
// opts in with a `// @vitest-environment jsdom` docblock on its first line, and
// pays ~215ms to boot jsdom — per file, not per test. `useFocusTrap.test.tsx`
// is the first such file. This replaces an earlier plan for a second config
// with jsdom plus a React plugin: neither is needed. React 19 exports `act`
// itself, `react-dom/client` renders into a jsdom document, and esbuild handles
// the JSX from tsconfig's `jsx: "react-jsx"`. One package, one glob entry.
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
    // `.test.tsx` needs its own entry: `*.test.ts` does not match it.
    //
    // `tools/` is here for one file. `tools/demo-reset.mjs` is plain Node (it
    // has to be — it runs outside Next, with no bundler and no `@/` aliases),
    // so it cannot live under `src/`. It carries two safety decisions that
    // failed in production on 2026-08-09, and safety logic this project cannot
    // test is safety logic it has already learned not to trust.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tools/**/*.test.mjs'],
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
