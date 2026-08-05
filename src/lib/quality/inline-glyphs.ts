/**
 * Finds icon glyphs drawn inline as `<svg>` rather than imported from
 * `src/components/ui/icons/`.
 *
 * The project accumulated 75 of these against 16 named components, with the
 * same glyph appearing in both forms — a check mark existed as `CheckIcon`, as
 * fifteen hand-typed copies, and in `react-icons`, which was already installed.
 * The copies drifted: three files mixed both styles in one component, stroke
 * weights disagreed, and 45 of the 75 set no `aria-hidden` where every
 * named component sets it for free.
 *
 * Nothing prevented that. Lint, typecheck and the suite all pass a hand-drawn
 * chevron, so the count only ever went up. This is the thing that stops it.
 *
 * WHAT IT FLAGS: an `<svg>` outside the icons folder whose body contains the
 * path data of a glyph that already has a component. Matching on path data
 * rather than on "any inline svg" is deliberate — one-off illustrations drawn
 * where they are used are legitimate and far more numerous, and flagging them
 * would make this noise, and noise gets switched off.
 *
 * THE ONE EXCEPTION, deliberate and recorded: `AdminPagination` draws a
 * chevron-down as a `bg-[url('data:image/svg+xml…')]` background on a native
 * `<select>`, because that is how you restyle a select's arrow. It is not an
 * `<svg>` element, so this scan does not see it, and any "zero inline chevrons"
 * claim has to carve it out. Restyling that select is a different piece of work.
 */

import type { SourceFile } from './source-files';

export type InlineGlyphFinding = {
  file: string;
  line: number;
  /** The glyph drawn, by its canonical component name. */
  component: string;
};

/**
 * Path data per glyph, taken from the components themselves.
 *
 * `plus` is tested before `minus` and the minus rule requires the plus to be
 * absent, because a plus contains the minus's horizontal line. Counting them
 * independently is exactly the mistake that produced 86 sites against a true
 * 73 during the audit that led here.
 */
const GLYPHS: [component: string, signature: RegExp][] = [
  ['CheckIcon', /points=["']20 6 9 17 4 12["']/],
  [
    'ChevronIcon',
    /points=["'](9 18 15 12 9 6|15 18 9 12 15 6|18 15 12 9 6 15|6 9 12 15 18 9)["']/,
  ],
  ['XIcon', /x1=["']18["']\s+y1=["']6["']\s+x2=["']6["']\s+y2=["']18["']/],
  ['PlusIcon', /x1=["']12["']\s+y1=["']5["']\s+x2=["']12["']\s+y2=["']19["']/],
  ['ArrowIcon', /M5 12h14M13 5l7 7-7 7|points=["']12 5 19 12 12 19["']/],
  ['ClockIcon', /points=["']12 6 12 12 16 14["']/],
  ['PinIcon', /M21 10c0 7-9 13-9 13s-9-6-9-13/],
  ['PhoneIcon', /M22 16\.92v3a2 2 0/],
  ['CartIcon', /M1 1h4l2\.68 13\.39/],
  ['HeartIcon', /M20\.84 4\.61a5\.5 5\.5 0/],
  ['StarIcon', /points=["']12,?\s?2 15\.09,?\s?8\.26/],
  ['SignOutIcon', /M9 21H5a2 2 0/],
];

const PLUS = GLYPHS.find(([name]) => name === 'PlusIcon')![1];
const MINUS = /x1=["']5["']\s+y1=["']12["']\s+x2=["']19["']\s+y2=["']12["']/;

const SVG_ELEMENT = /<svg\b[\s\S]*?>([\s\S]*?)<\/svg>/g;

export function scanInlineGlyphs(files: SourceFile[]): InlineGlyphFinding[] {
  const findings: InlineGlyphFinding[] = [];

  for (const { path, source } of files) {
    SVG_ELEMENT.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SVG_ELEMENT.exec(source)) !== null) {
      const body = match[1];

      let component = GLYPHS.find(([, signature]) =>
        signature.test(body),
      )?.[0];
      if (!component && MINUS.test(body) && !PLUS.test(body)) {
        component = 'MinusIcon';
      }
      if (!component) continue;

      findings.push({
        file: path,
        line: source.slice(0, match.index).split('\n').length,
        component,
      });
    }
  }

  return findings;
}
