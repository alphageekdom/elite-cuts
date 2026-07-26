import { describe, it, expect } from 'vitest';

import { formatLegalDate } from './legalDate';

// The constraint under test is the UTC pairing: the input parses as UTC
// midnight and the formatter is pinned to UTC. When the formatter ran in the
// viewer's local zone instead, everyone west of Greenwich saw the *previous*
// day — a bug that actually shipped. These assertions are deterministic on any
// runner because of the pin; remove either half of the pairing and they fail
// on any machine west of UTC.
describe('formatLegalDate', () => {
  it('renders the named day, not the day before', () => {
    expect(formatLegalDate('2026-05-20')).toBe('May 20, 2026');
  });

  it('holds at the month boundary, where an off-by-one changes the month', () => {
    expect(formatLegalDate('2026-08-01')).toBe('August 1, 2026');
  });

  it('holds at the year boundary, where an off-by-one changes the year', () => {
    expect(formatLegalDate('2026-01-01')).toBe('January 1, 2026');
  });
});
