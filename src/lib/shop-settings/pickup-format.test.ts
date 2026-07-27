import { describe, expect, it } from 'vitest';

import type { ShopHoursDay } from '@/models/ShopHours';
import {
  formatClockMinutes,
  formatReadyIn,
  getPickupNote,
  parseClockMinutes,
  parseLeadMinutes,
  shopWeekdayIndex,
} from './pickup-format';

const OPEN = (dayOfWeek: number, closesAt: string): ShopHoursDay => ({
  dayOfWeek,
  opensAt: '9:00 AM',
  closesAt,
  isClosed: false,
});
const CLOSED = (dayOfWeek: number): ShopHoursDay => ({
  dayOfWeek,
  opensAt: '',
  closesAt: '',
  isClosed: true,
});

// Mon–Fri 9–7, Sat 10–4, Sun closed — the seeded default shape.
const WEEK: ShopHoursDay[] = [
  OPEN(0, '7:00 PM'),
  OPEN(1, '7:00 PM'),
  OPEN(2, '7:00 PM'),
  OPEN(3, '7:00 PM'),
  OPEN(4, '7:00 PM'),
  OPEN(5, '4:00 PM'),
  CLOSED(6),
];

// A Wednesday at noon Pacific — 2026-07-22T19:00:00Z is 12:00 PDT.
const WED_NOON = new Date('2026-07-22T19:00:00Z');
// A Sunday — 2026-07-26T19:00:00Z is 12:00 PDT Sunday.
const SUN_NOON = new Date('2026-07-26T19:00:00Z');
// Wednesday 6:30 PM PDT (exactly the 30-min-before-7pm cutoff) — 01:30Z Thu.
const WED_AT_CUTOFF = new Date('2026-07-23T01:30:00Z');
// Wednesday 6:45 PM PDT (past the cutoff, before close) — 01:45Z Thu.
const WED_PAST_CUTOFF = new Date('2026-07-23T01:45:00Z');
// Wednesday 9:00 PM PDT (after close entirely) — 04:00Z Thu.
const WED_AFTER_CLOSE = new Date('2026-07-23T04:00:00Z');

describe('parseClockMinutes', () => {
  it('parses the shop-hours formats', () => {
    expect(parseClockMinutes('7:00 PM')).toBe(19 * 60);
    expect(parseClockMinutes('9:00 AM')).toBe(9 * 60);
    expect(parseClockMinutes('12:00 PM')).toBe(12 * 60);
    expect(parseClockMinutes('12:00 AM')).toBe(0);
    expect(parseClockMinutes('4 pm')).toBe(16 * 60);
  });

  it('rejects nonsense', () => {
    expect(parseClockMinutes('')).toBeNull();
    expect(parseClockMinutes('25:00 PM')).toBeNull();
    expect(parseClockMinutes('noon')).toBeNull();
  });
});

describe('formatClockMinutes', () => {
  it('drops :00 on the hour and lower-cases the meridiem', () => {
    expect(formatClockMinutes(16 * 60)).toBe('4 pm');
    expect(formatClockMinutes(18 * 60 + 30)).toBe('6:30 pm');
    expect(formatClockMinutes(9 * 60)).toBe('9 am');
    expect(formatClockMinutes(0)).toBe('12 am');
    expect(formatClockMinutes(12 * 60)).toBe('12 pm');
  });
});

describe('parseLeadMinutes', () => {
  it('parses the three admin options', () => {
    expect(parseLeadMinutes('30 min')).toBe(30);
    expect(parseLeadMinutes('1 hour')).toBe(60);
    expect(parseLeadMinutes('2 hours')).toBe(120);
  });

  it('rejects garbage', () => {
    expect(parseLeadMinutes('soon')).toBeNull();
    expect(parseLeadMinutes('0 min')).toBeNull();
  });
});

describe('shopWeekdayIndex', () => {
  it('returns Monday-first index for the shop timezone', () => {
    // Wednesday → index 2 (Mon=0)
    expect(shopWeekdayIndex('America/Los_Angeles (PT)', WED_NOON)).toBe(2);
    // Sunday → index 6
    expect(shopWeekdayIndex('America/Los_Angeles (PT)', SUN_NOON)).toBe(6);
  });

  it('uses the timezone, not the server clock', () => {
    // 2026-07-23T05:00:00Z is still Wed 22:00 in LA but Thu in UTC.
    const lateWedPacific = new Date('2026-07-23T05:00:00Z');
    expect(shopWeekdayIndex('America/Los_Angeles (PT)', lateWedPacific)).toBe(2);
  });
});

describe('getPickupNote', () => {
  it('sets an order-by cutoff of closing minus lead time on an open day', () => {
    const note = getPickupNote({
      days: WEEK,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: WED_NOON,
    });
    expect(note.readyIn).toBe('about 30 min');
    expect(note.timing).toBe('Order by 6:30 pm · Same-day pickup');
  });

  it('still offers same-day right up to the cutoff minute', () => {
    const note = getPickupNote({
      days: WEEK,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: WED_AT_CUTOFF,
    });
    expect(note.timing).toBe('Order by 6:30 pm · Same-day pickup');
  });

  it('points at the next open day once today’s cutoff has passed', () => {
    const note = getPickupNote({
      days: WEEK,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: WED_PAST_CUTOFF,
    });
    expect(note.timing).toBe('Cutoff passed · Pickup resumes Thursday');
  });

  it('does not promise same-day after the shop has closed', () => {
    const note = getPickupNote({
      days: WEEK,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: WED_AFTER_CLOSE,
    });
    expect(note.timing).toBe('Cutoff passed · Pickup resumes Thursday');
  });

  it('points at the next open day when closed today', () => {
    const note = getPickupNote({
      days: WEEK,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: SUN_NOON,
    });
    expect(note.timing).toBe('Closed today · Pickup resumes Monday');
  });

  it('drops the cutoff but keeps same-day when closing time is unparseable', () => {
    const broken = WEEK.map((d) =>
      d.dayOfWeek === 2 ? { ...d, closesAt: 'evening' } : d,
    );
    const note = getPickupNote({
      days: broken,
      leadTime: '30 min',
      timezone: 'America/Los_Angeles (PT)',
      now: WED_NOON,
    });
    expect(note.timing).toBe('Same-day pickup');
  });
});

describe('formatReadyIn', () => {
  it('prefixes a parseable lead time with "about"', () => {
    expect(formatReadyIn('30 min')).toBe('about 30 min');
    expect(formatReadyIn('2 hours')).toBe('about 2 hours');
  });

  it('trims surrounding whitespace from the configured value', () => {
    expect(formatReadyIn('  45 min  ')).toBe('about 45 min');
  });

  // Every caller composes this after "ready in" / "Pickup ready in", so the
  // fallback has to be grammatical in that slot. The previous 'shortly' read
  // as "ready in shortly" on the cart drawer and the catalog hero.
  it('falls back to a phrase that reads correctly after "ready in"', () => {
    expect(`ready in ${formatReadyIn('whenever')}`).toBe(
      'ready in a short while',
    );
    expect(formatReadyIn('')).toBe('a short while');
  });
});
