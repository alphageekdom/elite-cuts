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
  },
});
