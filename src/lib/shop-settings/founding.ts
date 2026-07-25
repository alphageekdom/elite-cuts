// The shop's founding year. Lives in code rather than shop settings because
// it's fixed storefront lore, not something an admin tunes — but it belongs in
// exactly one place so the "N years" copy can be derived instead of frozen.
// Before this, "Eight years" was a literal in three components and would have
// silently gone stale the moment the calendar rolled over.
export const FOUNDED_YEAR = 2018;

// 1-indexed. The origin copy and the first timeline chapter both date the
// opening to March, so a plain year subtraction would start claiming the new
// year's worth on January 1 — almost three months early.
export const FOUNDED_MONTH = 3;

// Spelled-out forms for editorial copy. Past the list we fall back to digits —
// "Twenty-one years" reads worse than "21 years" anyway, and the shop would
// have to outlive this comment for it to matter.
const SPELLED = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
] as const;

// Whole years open as of `now` — the anniversary has to have passed, so this
// never rounds up. Caller supplies the clock so this stays pure and testable;
// page components read it once per request. Month granularity is deliberate:
// the shop's founding day isn't recorded anywhere, only the month.
export function yearsSinceFounding(now: Date): number {
  const elapsed = now.getFullYear() - FOUNDED_YEAR;
  const beforeAnniversary = now.getMonth() + 1 < FOUNDED_MONTH;
  return Math.max(0, beforeAnniversary ? elapsed - 1 : elapsed);
}

// Capitalised label for prose — "Eight years". Every current consumer starts a
// sentence or an eyebrow with it, so it's capitalised at the source rather than
// leaving each call site to fix the casing.
export function foundingYearsLabel(now: Date): string {
  const years = yearsSinceFounding(now);
  const word = SPELLED[years] ?? String(years);
  return `${word} ${years === 1 ? 'year' : 'years'}`;
}
