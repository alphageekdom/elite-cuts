import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // React 19's eslint-plugin-react-hooks v7 flags common timer/clock patterns as errors
    // (setState inside useEffect, Date.now() during render, etc.). These stay at 'warn' to
    // mark them as "our judgement, not the plugin's default" — but note `lint` runs with
    // --max-warnings=0, so a warning fails that command exactly like an error. The severity
    // is a label here, not an escape hatch.
    //
    // Caveat worth knowing: `npm run lint` is the ONLY thing that enforces this. Next 16
    // removed ESLint from `next build` (the `next lint` subsystem is gone), and there is no
    // CI workflow or git hook in this repo — so a push can deploy warning-dirty. Until a CI
    // step exists, the gate is a convention backed by a flag, not an automatic check.
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
    // request, so it cannot hit that failure mode. Four page.tsx files (orders, customers,
    // inventory, profile) each carried an eslint-disable line saying exactly that; this
    // states it once, structurally, instead.
    //
    // Scoped to page.tsx deliberately, not `src/app/**`: error.tsx and loading.tsx ARE client
    // components, so a blanket app-dir override would silently disable a rule that genuinely
    // applies to them. All 28 page.tsx files are server components today.
    //
    // Two things this widens beyond the four lines it replaced, both deliberate:
    //
    // 1. It covers all 28 pages, not the 4 that were flagged. 8 pages read a clock — the 4
    //    above via Date.now(), and 4 more (dashboard, analytics, schedule, staff) via bare
    //    `new Date()`, which this rule version does not flag at all. So the rule's coverage
    //    was already partial; the override makes the treatment uniform rather than depending
    //    on which clock API a page happened to use.
    // 2. It silences the whole rule for those files, not just clock reads — Math.random(),
    //    crypto.randomUUID() and friends included. That is consistent with the reasoning
    //    (render-once-per-request defeats the instability the rule guards against), but it
    //    does mean a future impure call in a page lands unreviewed.
    //
    // The tradeoff to know about: if a page.tsx ever gains 'use client', this override goes
    // quiet for it and the rule stops protecting a file it should protect. No glob can see
    // the directive, so nothing catches that automatically — the guard is knowing this
    // comment exists. Prefer moving interactive work into a child client component (the
    // pattern every page here follows already) over adding 'use client' to a page.
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
