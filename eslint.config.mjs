import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // React 19's eslint-plugin-react-hooks v7 flags common timer/clock patterns as errors
    // (setState inside useEffect, Date.now() during render, etc.). These stay at 'warn' to
    // mark them as "our judgement, not the plugin's default" — but note `lint` runs with
    // --max-warnings=0, so a warning fails the gate exactly like an error. The severity is a
    // label here, not an escape hatch: nothing in this project is allowed to stay warning-dirty.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      // Honor the underscore-prefix convention for intentionally unused args/destructure slots
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // `react-hooks/purity` guards against impure calls during render producing unstable
    // results when a component happens to re-render. A server component renders once per
    // request, so `Date.now()` in one cannot hit that failure mode — the four page.tsx files
    // that read the clock (orders, customers, inventory, profile) were each carrying an
    // eslint-disable line saying exactly that. This states it once, structurally, instead.
    //
    // Scoped to page.tsx deliberately, not `src/app/**`: error.tsx and loading.tsx ARE client
    // components, so a blanket app-dir override would silently disable a rule that genuinely
    // applies to them. All 28 page.tsx files are server components today.
    //
    // The tradeoff to know about: if a page.tsx ever gains 'use client', this override goes
    // quiet for it and the rule stops protecting a file it should protect. There's no glob
    // that can see the directive, so the guard is knowing this comment exists. Prefer moving
    // interactive work into a child client component (the pattern every page here follows
    // already) over adding 'use client' to a page.
    files: ['src/app/**/page.tsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      // Repo-root utility scripts (.mjs seed/migrate/reset jobs) — pre-prod, not part of the app
      'scripts/**',
      // Playwright MCP artifacts (hundreds of generated files)
      '.playwright-mcp/**',
      // Generated coverage reports if added later
      'coverage/**',
    ],
  },
];

export default config;
