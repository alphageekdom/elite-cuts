import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRC_ROOT, readSourceFiles } from './source-files';

import type { SourceFile } from './handler-wiring';
import { scanInlineGlyphs } from './inline-glyphs';

// ── What this covers ────────────────────────────────────────────────────
//
// Same split as `handler-wiring`: the fixtures pin the RULE, the repo scan at
// the bottom is the actual guard.
//
// The property is syntactic — a glyph is either drawn inline or imported — so
// there is no runtime in which to observe it, which is exactly why lint,
// typecheck and the suite all passed 75 of these for months.

const fixture = (source: string): SourceFile[] => [
  { path: 'Test.tsx', source },
];

describe('scanInlineGlyphs — the rule', () => {
  it('flags a check drawn inline', () => {
    const found = scanInlineGlyphs(
      fixture(`
        export const X = () => (
          <svg viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12' /></svg>
        );
      `),
    );

    expect(found).toHaveLength(1);
    expect(found[0].component).toBe('CheckIcon');
  });

  it('does not flag a one-off illustration', () => {
    // The clipboard in StoreInfoModal, reduced. Far more inline SVGs are
    // legitimate one-offs than are duplicated glyphs; flagging them would make
    // this noise, and noise gets switched off.
    const found = scanInlineGlyphs(
      fixture(`
        <svg viewBox='0 0 24 24'>
          <rect x='9' y='2' width='6' height='4' rx='1' />
          <path d='M9 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-3' />
        </svg>
      `),
    );

    expect(found).toEqual([]);
  });

  it('does not read a plus as a minus', () => {
    // A plus contains the minus's horizontal line. Counting them independently
    // is what produced 86 sites against a true 73 during the audit that led to
    // this file, so the ordering is pinned rather than left to the reader.
    const plus = scanInlineGlyphs(
      fixture(`
        <svg viewBox='0 0 24 24'>
          <line x1='12' y1='5' x2='12' y2='19' />
          <line x1='5' y1='12' x2='19' y2='12' />
        </svg>
      `),
    );
    const minus = scanInlineGlyphs(
      fixture(`<svg><line x1='5' y1='12' x2='19' y2='12' /></svg>`),
    );

    expect(plus.map((f) => f.component)).toEqual(['PlusIcon']);
    expect(minus.map((f) => f.component)).toEqual(['MinusIcon']);
  });

  it('catches both arrow constructions', () => {
    // The set was Feather except for the arrow, which was Lucide's single-path
    // shape. Both are flagged so re-introducing either one fails.
    const lucide = scanInlineGlyphs(
      fixture(`<svg><path d='M5 12h14M13 5l7 7-7 7' /></svg>`),
    );
    const feather = scanInlineGlyphs(
      fixture(
        `<svg><line x1='5' y1='12' x2='19' y2='12' /><polyline points='12 5 19 12 12 19' /></svg>`,
      ),
    );

    expect(lucide.map((f) => f.component)).toEqual(['ArrowIcon']);
    expect(feather.map((f) => f.component)).toEqual(['ArrowIcon']);
  });

  it('reports every glyph in a file, not just the first', () => {
    const found = scanInlineGlyphs(
      fixture(`
        <svg><polyline points='20 6 9 17 4 12' /></svg>
        <svg><polyline points='9 18 15 12 9 6' /></svg>
      `),
    );

    expect(found.map((f) => f.component)).toEqual(['CheckIcon', 'ChevronIcon']);
  });
});

// ── The guard ───────────────────────────────────────────────────────────

const ICONS = join(SRC_ROOT, 'components', 'ui', 'icons');

describe('no icon glyph is drawn inline outside the icons folder', () => {
  it('finds nothing', () => {
    // The icons folder is where the glyphs are supposed to live. Three of the
    // sixteen are still hand-drawn there on purpose — Spinner, User and
    // Dashboard each differ from their nearest package equivalent by 48–92% of
    // inked pixels, and each file says so.
    const files = readSourceFiles().filter((f) => !f.path.startsWith(ICONS + sep));

    // Sanity: the scan must actually be looking at something. Without this a
    // broken walk reports zero findings and reads as a pass.
    expect(files.length).toBeGreaterThan(200);

    const findings = scanInlineGlyphs(files);
    expect(
      findings.map((f) => `${relative(SRC_ROOT, f.file)}:${f.line} ${f.component}`),
    ).toEqual([]);
  });
});
