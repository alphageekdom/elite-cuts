// Shared by both legal pages so the two can't drift on this.
//
// The `T00:00:00Z` suffix and the matching `timeZone: 'UTC'` are load-bearing
// together: a bare `new Date('2026-05-20')` is already UTC midnight, so
// formatting it in the viewer's local zone rendered the *previous* day for
// anyone west of Greenwich. Pinning the formatter to UTC is what fixed it.
// Change one without the other and the off-by-one day comes back.
const LEGAL_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `2026-05-20` → `May 20, 2026`, identically for every reader. */
export function formatLegalDate(isoDate: string): string {
  return LEGAL_DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}
