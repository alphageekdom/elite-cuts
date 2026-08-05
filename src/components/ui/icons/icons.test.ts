import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ArrowIcon from './ArrowIcon';
import CartIcon from './CartIcon';
import CheckIcon from './CheckIcon';
import ChevronIcon from './ChevronIcon';
import ClockIcon from './ClockIcon';
import DashboardIcon from './DashboardIcon';
import HeartIcon from './HeartIcon';
import MinusIcon from './MinusIcon';
import PhoneIcon from './PhoneIcon';
import PinIcon from './PinIcon';
import PlusIcon from './PlusIcon';
import SignOutIcon from './SignOutIcon';
import SpinnerIcon from './SpinnerIcon';
import StarIcon from './StarIcon';
import UserIcon from './UserIcon';
import XIcon from './XIcon';

// ── The static-render tier ──────────────────────────────────────────────
//
// `renderToStaticMarkup` from `react-dom/server` renders this project's `.tsx`
// client components from a `.test.ts` file, in the existing `environment: 'node'`
// suite. No jsdom, no React Testing Library, no config change — react-dom is
// already a dependency and `tsconfig`'s `jsx: "react-jsx"` is enough for esbuild.
//
// WHAT IT COVERS: rendered markup. Attributes, ARIA, and any branch driven by
// props. That is the whole of what these icon wrappers do.
//
// WHAT IT DOES NOT COVER: effects never run, so anything inside `useEffect` is
// invisible; there are no events, no focus, and no layout. A component whose
// branch is driven by internal `useState` renders only its initial state. For
// those, a DOM is genuinely required — see the focus-trap work.
//
// IMPORTS THAT NEED HELP, measured rather than assumed:
//   next/image, next/link   — render unmocked, nothing to do
//   next/navigation         — usePathname() returns null, so a component that
//                             calls a string method on it throws. One line:
//                             vi.mock('next/navigation', () => ({ usePathname: () => '/x' }))
//   next-auth/react         — useSession() throws by design. One line:
//                             vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
//
// ── What this file pins ─────────────────────────────────────────────────
//
// Thirteen of these sixteen are thin wrappers over `react-icons/fi` (Feather),
// which is where their paths were hand-copied from in the first place. Wrapping
// rather than importing `FiCheck` at each call site is what keeps `filled`,
// `direction` and the `aria-hidden` default in one place.
//
// The realistic regressions are all silent: importing `FiCheckCircle` instead of
// `FiCheck`, or dropping a `strokeWidth` so a glyph inherits react-icons' own
// default of 2 rather than the weight this app draws it at. Neither is visible
// to the type checker and neither would fail a build. Hence the per-icon
// assertions below rather than a single smoke test.

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);

describe('icon wrappers render the glyph they name', () => {
  const CASES: [string, () => string, string][] = [
    ['arrow', () => html(createElement(ArrowIcon)), 'polyline points="12 5 19 12 12 19"'],
    ['cart', () => html(createElement(CartIcon)), 'M1 1h4l2.68 13.39'],
    ['check', () => html(createElement(CheckIcon)), 'points="20 6 9 17 4 12"'],
    [
      'chevron right',
      () => html(createElement(ChevronIcon, { direction: 'right' })),
      'points="9 18 15 12 9 6"',
    ],
    ['clock', () => html(createElement(ClockIcon)), 'points="12 6 12 12 16 14"'],
    ['heart', () => html(createElement(HeartIcon)), 'M20.84 4.61a5.5 5.5 0'],
    ['minus', () => html(createElement(MinusIcon)), 'x1="5" y1="12" x2="19" y2="12"'],
    ['phone', () => html(createElement(PhoneIcon)), 'M22 16.92v3a2 2 0'],
    ['pin', () => html(createElement(PinIcon)), 'M21 10c0 7-9 13-9 13s-9-6-9-13'],
    ['plus', () => html(createElement(PlusIcon)), 'x1="12" y1="5" x2="12" y2="19"'],
    ['sign out', () => html(createElement(SignOutIcon)), 'points="16 17 21 12 16 7"'],
    ['star', () => html(createElement(StarIcon)), 'polygon points="12 2 15.09 8.26'],
    ['x', () => html(createElement(XIcon)), 'x1="18" y1="6" x2="6" y2="18"'],
  ];

  it.each(CASES)('%s', (_name, render, fragment) => {
    expect(render()).toContain(fragment);
  });

  it('draws all four chevron directions', () => {
    const points = (direction: 'right' | 'left' | 'up' | 'down') =>
      html(createElement(ChevronIcon, { direction })).match(
        /points="([^"]+)"/,
      )?.[1];

    expect(points('right')).toBe('9 18 15 12 9 6');
    expect(points('left')).toBe('15 18 9 12 15 6');
    expect(points('up')).toBe('18 15 12 9 6 15');
    expect(points('down')).toBe('6 9 12 15 18 9');
  });
});

describe('stroke weights survive the wrapper', () => {
  // react-icons hardcodes stroke-width 2. Every wrapper that draws at a
  // different weight has to pass it through, and a dropped pass-through is
  // invisible to the type checker.
  const weightOf = (markup: string) =>
    markup.match(/stroke-width="([^"]+)"/)?.[1];

  it.each([
    ['check', '2.5', () => html(createElement(CheckIcon))],
    ['x', '2.5', () => html(createElement(XIcon))],
    ['plus', '2.5', () => html(createElement(PlusIcon))],
    ['minus', '2.5', () => html(createElement(MinusIcon))],
    ['arrow', '2', () => html(createElement(ArrowIcon))],
    ['clock', '2', () => html(createElement(ClockIcon))],
  ] as [string, string, () => string][])(
    '%s defaults to %s',
    (_name, expected, render) => {
      expect(weightOf(render())).toBe(expected);
    },
  );

  it('honours an explicit override', () => {
    expect(weightOf(html(createElement(XIcon, { strokeWidth: 2 })))).toBe('2');
    expect(
      weightOf(html(createElement(ChevronIcon, { direction: 'up', strokeWidth: 3 }))),
    ).toBe('3');
  });
});

describe('the two filled glyphs', () => {
  // `filled` is the reason Heart and Star stay wrappers rather than becoming
  // direct imports — react-icons has no equivalent, so the fill/stroke pairing
  // would otherwise be repeated at every rating row and save-heart.
  it('heart fills with currentColor and keeps its stroke', () => {
    expect(html(createElement(HeartIcon, { filled: true }))).toContain(
      'fill="currentColor"',
    );
    expect(html(createElement(HeartIcon, { filled: false }))).toContain(
      'fill="none"',
    );
  });

  it('star drops its stroke to 0 when filled, so both states read the same size', () => {
    const filled = html(createElement(StarIcon, { filled: true }));
    expect(filled).toContain('fill="currentColor"');
    expect(filled).toContain('stroke-width="0"');

    const outline = html(createElement(StarIcon, { filled: false }));
    expect(outline).toContain('fill="none"');
    expect(outline).toContain('stroke-width="1.5"');
  });

  it('heart carries its fill transition without dropping the caller class', () => {
    const markup = html(createElement(HeartIcon, { className: 'w-5 h-5' }));
    expect(markup).toContain('transition-[fill]');
    expect(markup).toContain('w-5 h-5');
  });
});

describe('every icon hides itself from assistive technology', () => {
  // 45 of the 75 inline sites these wrappers replaced set no aria-hidden at all.
  // Routing them through the wrappers is what closes that, so it is pinned here
  // rather than left as a property of whichever library is underneath.
  it.each([
    ['arrow', () => html(createElement(ArrowIcon))],
    ['cart', () => html(createElement(CartIcon))],
    ['check', () => html(createElement(CheckIcon))],
    ['chevron', () => html(createElement(ChevronIcon, { direction: 'down' }))],
    ['clock', () => html(createElement(ClockIcon))],
    ['dashboard', () => html(createElement(DashboardIcon))],
    ['heart', () => html(createElement(HeartIcon))],
    ['minus', () => html(createElement(MinusIcon))],
    ['phone', () => html(createElement(PhoneIcon))],
    ['pin', () => html(createElement(PinIcon))],
    ['plus', () => html(createElement(PlusIcon))],
    ['sign out', () => html(createElement(SignOutIcon))],
    ['spinner', () => html(createElement(SpinnerIcon))],
    ['star', () => html(createElement(StarIcon))],
    ['user', () => html(createElement(UserIcon))],
    ['x', () => html(createElement(XIcon))],
  ] as [string, () => string][])('%s', (_name, render) => {
    expect(render()).toContain('aria-hidden="true"');
  });
});

describe('the three hand-drawn glyphs stay hand-drawn', () => {
  // Each of these differs from its nearest Feather equivalent by 48–92% of
  // inked pixels, and each file says so. This is the machine-readable half of
  // that note: a future sweep that swaps them for FiLoader / FiUser / FiGrid
  // fails here rather than shipping a different-looking icon.
  it('spinner is a ring and an arc, not a sunburst', () => {
    const markup = html(createElement(SpinnerIcon));
    expect(markup).toContain('M22 12a10 10 0 01-10 10');
    expect(markup).toContain('animate-spin');
  });

  it('user has a smooth shoulder arc, not squared shoulders', () => {
    expect(html(createElement(UserIcon))).toContain(
      'M4.5 20.5v-.75a7.5 7.5 0 0115 0v.75',
    );
  });

  it('dashboard panels are unequal, not a symmetric 2x2', () => {
    const markup = html(createElement(DashboardIcon));
    const sizes = [...markup.matchAll(/width="([\d.]+)" height="([\d.]+)"/g)].map(
      (m) => `${m[1]}x${m[2]}`,
    );
    expect(new Set(sizes).size).toBeGreaterThan(1);
  });
});
