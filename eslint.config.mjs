import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // React 19's eslint-plugin-react-hooks v7 flags common timer/clock patterns as errors
    // (setState inside useEffect, Date.now() during render, etc.). Keeping them as warnings —
    // they signal patterns worth revisiting, but most current uses are intentional timer hooks.
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
