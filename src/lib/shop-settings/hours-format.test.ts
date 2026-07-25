import { describe, expect, it } from 'vitest';

import type { ShopHoursDay } from '@/models/ShopHours';

import {
  compactClock,
  formatOpenDaysSpan,
  formatShopHoursCondensed,
  formatShopHoursRows,
} from './hours-format';

// Tiny constructor so the fixtures read like English instead of a wall of
// braces. dayOfWeek follows the model's 0=Mon … 6=Sun convention.
const open = (dayOfWeek: number, opensAt: string, closesAt: string): ShopHoursDay => ({
  dayOfWeek,
  opensAt,
  closesAt,
  isClosed: false,
});
const closed = (dayOfWeek: number): ShopHoursDay => ({
  dayOfWeek,
  opensAt: '',
  closesAt: '',
  isClosed: true,
});

describe('formatShopHoursRows', () => {
  it('returns an empty array for an empty input', () => {
    expect(formatShopHoursRows([])).toEqual([]);
  });

  it('renders a single day verbatim', () => {
    expect(formatShopHoursRows([open(0, '9:00 AM', '5:00 PM')])).toEqual([
      { label: 'Monday', value: '9:00 AM – 5:00 PM' },
    ]);
  });

  it('groups consecutive days with identical hours into a range row', () => {
    const days = [
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Tuesday – Saturday', value: '9:00 AM – 7:00 PM' },
    ]);
  });

  it('collapses an all-closed week into one range row', () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => closed(d));
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Monday – Sunday', value: 'Closed' },
    ]);
  });

  it('formats the default-seed shape into three rows', () => {
    const days: ShopHoursDay[] = [
      closed(0),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
      open(6, '10:00 AM', '4:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Monday', value: 'Closed' },
      { label: 'Tuesday – Saturday', value: '9:00 AM – 7:00 PM' },
      { label: 'Sunday', value: '10:00 AM – 4:00 PM' },
    ]);
  });

  it('breaks a run when one day inside it has different hours', () => {
    const days: ShopHoursDay[] = [
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '8:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Tuesday – Wednesday', value: '9:00 AM – 7:00 PM' },
      { label: 'Thursday', value: '8:00 AM – 7:00 PM' },
      { label: 'Friday – Saturday', value: '9:00 AM – 7:00 PM' },
    ]);
  });

  it('does not fuse non-consecutive days with matching hours', () => {
    // Monday and Wednesday share hours but Tuesday is closed — Mon and Wed
    // must NOT collapse into a "Monday – Wednesday" row across the gap.
    const days: ShopHoursDay[] = [
      open(0, '9:00 AM', '5:00 PM'),
      closed(1),
      open(2, '9:00 AM', '5:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Monday', value: '9:00 AM – 5:00 PM' },
      { label: 'Tuesday', value: 'Closed' },
      { label: 'Wednesday', value: '9:00 AM – 5:00 PM' },
    ]);
  });

  it('sorts unordered input by dayOfWeek before grouping', () => {
    const days: ShopHoursDay[] = [
      open(3, '9:00 AM', '7:00 PM'),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Tuesday – Thursday', value: '9:00 AM – 7:00 PM' },
    ]);
  });

  it('keeps a closed day adjacent to open days as its own row', () => {
    const days: ShopHoursDay[] = [
      open(0, '9:00 AM', '7:00 PM'),
      open(1, '9:00 AM', '7:00 PM'),
      closed(2),
      open(3, '9:00 AM', '7:00 PM'),
    ];
    expect(formatShopHoursRows(days)).toEqual([
      { label: 'Monday – Tuesday', value: '9:00 AM – 7:00 PM' },
      { label: 'Wednesday', value: 'Closed' },
      { label: 'Thursday', value: '9:00 AM – 7:00 PM' },
    ]);
  });

  it('falls back to a placeholder label for an out-of-range dayOfWeek', () => {
    expect(formatShopHoursRows([open(9, '9:00 AM', '5:00 PM')])).toEqual([
      { label: 'Day 9', value: '9:00 AM – 5:00 PM' },
    ]);
  });
});

describe('compactClock', () => {
  it('drops :00 minutes and lowercases the meridiem', () => {
    expect(compactClock('9:00 AM')).toBe('9am');
    expect(compactClock('7:00 PM')).toBe('7pm');
    expect(compactClock('10:00 AM')).toBe('10am');
    expect(compactClock('12:00 PM')).toBe('12pm');
  });

  it('keeps minutes when they are not :00', () => {
    expect(compactClock('9:30 AM')).toBe('9:30am');
    expect(compactClock('5:45 PM')).toBe('5:45pm');
  });

  it('tolerates spacing and punctuation variants', () => {
    expect(compactClock('9:00AM')).toBe('9am');
    expect(compactClock('  9:00 am  ')).toBe('9am');
    expect(compactClock('9:00 p.m.')).toBe('9pm');
  });

  it('passes unparseable values through trimmed rather than dropping them', () => {
    expect(compactClock('  dawn  ')).toBe('dawn');
    expect(compactClock('')).toBe('');
    // 24-hour input isn't the stored format; it must survive untouched
    // instead of being silently mangled into a wrong meridiem.
    expect(compactClock('17:00')).toBe('17:00');
  });
});

describe('formatShopHoursCondensed', () => {
  it('returns an empty array for an empty input', () => {
    expect(formatShopHoursCondensed([])).toEqual([]);
  });

  it('formats the default-seed shape into three compact rows, open days first', () => {
    const days: ShopHoursDay[] = [
      closed(0),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
      open(6, '10:00 AM', '4:00 PM'),
    ];
    // Monday is dayOfWeek 0 but sorts last: a compact block should lead with
    // the trading hours, not with the closure.
    expect(formatShopHoursCondensed(days)).toEqual([
      { label: 'Tue–Sat', value: '9am–7pm', isClosed: false },
      { label: 'Sun', value: '10am–4pm', isClosed: false },
      { label: 'Mon', value: 'Closed', isClosed: true },
    ]);
  });

  it('flags closed rows so consumers can phrase them differently', () => {
    const rows = formatShopHoursCondensed([closed(0), closed(1)]);
    expect(rows).toEqual([
      { label: 'Mon–Tue', value: 'Closed', isClosed: true },
    ]);
  });

  it('groups the same way the long formatter does', () => {
    // A run broken in the middle must break identically in both formatters,
    // so the footer and the contact page can never disagree on which days
    // belong together.
    const days: ShopHoursDay[] = [
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '8:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
    ];
    // Same number of groups, split at the same places — only the naming and
    // the clock rendering differ between the two formatters.
    expect(formatShopHoursCondensed(days)).toHaveLength(
      formatShopHoursRows(days).length,
    );
    expect(formatShopHoursCondensed(days)).toEqual([
      { label: 'Tue–Wed', value: '9am–7pm', isClosed: false },
      { label: 'Thu', value: '8am–7pm', isClosed: false },
      { label: 'Fri–Sat', value: '9am–7pm', isClosed: false },
    ]);
  });

  it('sorts unordered input by dayOfWeek before grouping', () => {
    const days: ShopHoursDay[] = [
      open(3, '9:00 AM', '7:00 PM'),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
    ];
    expect(formatShopHoursCondensed(days)).toEqual([
      { label: 'Tue–Thu', value: '9am–7pm', isClosed: false },
    ]);
  });

  it('does not fuse non-consecutive days with matching hours', () => {
    // Mon and Wed share hours but Tuesday's closure sits between them, so they
    // stay separate rows even though the closed row is reordered to the end.
    const days: ShopHoursDay[] = [
      open(0, '9:00 AM', '5:00 PM'),
      closed(1),
      open(2, '9:00 AM', '5:00 PM'),
    ];
    expect(formatShopHoursCondensed(days)).toEqual([
      { label: 'Mon', value: '9am–5pm', isClosed: false },
      { label: 'Wed', value: '9am–5pm', isClosed: false },
      { label: 'Tue', value: 'Closed', isClosed: true },
    ]);
  });

  it('falls back to a placeholder label for an out-of-range dayOfWeek', () => {
    expect(formatShopHoursCondensed([open(9, '9:00 AM', '5:00 PM')])).toEqual([
      { label: 'Day 9', value: '9am–5pm', isClosed: false },
    ]);
  });
});

describe('formatOpenDaysSpan', () => {
  it('spans the first open day to the last', () => {
    // Default shape: Monday closed, Tue–Sun trading.
    const days: ShopHoursDay[] = [
      closed(0),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
      open(6, '10:00 AM', '4:00 PM'),
    ];
    expect(formatOpenDaysSpan(days)).toBe('Tue–Sun');
  });

  it('returns the single day when only one is open', () => {
    expect(formatOpenDaysSpan([closed(0), open(3, '9:00 AM', '5:00 PM')])).toBe(
      'Thu',
    );
  });

  it('returns null when the shop is never open so callers can drop the clause', () => {
    expect(formatOpenDaysSpan([closed(0), closed(1)])).toBeNull();
    expect(formatOpenDaysSpan([])).toBeNull();
  });

  it('sorts unordered input before picking the ends', () => {
    const days: ShopHoursDay[] = [
      open(3, '9:00 AM', '7:00 PM'),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
    ];
    expect(formatOpenDaysSpan(days)).toBe('Tue–Thu');
  });

  it('returns null when the open days are not consecutive', () => {
    // A mid-week closure: spanning first-to-last would read "Tue–Sat" and
    // claim a Wednesday the shop is shut, so the caller drops the clause.
    const days: ShopHoursDay[] = [
      open(1, '9:00 AM', '7:00 PM'),
      closed(2),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
    ];
    expect(formatOpenDaysSpan(days)).toBeNull();
  });

  it('still spans the full week when only the bookend day is closed', () => {
    // The shape that actually ships: Monday shut, Tue–Sun trading straight
    // through, so the range stays honest.
    const days: ShopHoursDay[] = [
      closed(0),
      open(1, '9:00 AM', '7:00 PM'),
      open(2, '9:00 AM', '7:00 PM'),
      open(3, '9:00 AM', '7:00 PM'),
      open(4, '9:00 AM', '7:00 PM'),
      open(5, '9:00 AM', '7:00 PM'),
      open(6, '10:00 AM', '4:00 PM'),
    ];
    expect(formatOpenDaysSpan(days)).toBe('Tue–Sun');
  });
});
