import { describe, expect, it } from 'vitest';

import type { ShopHoursDay } from '@/models/ShopHours';

import { formatShopHoursRows } from './shopHoursFormat';

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
