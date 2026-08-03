import { describe, it, expect } from 'vitest';

import {
  EVENT_MESSAGE_MAX,
  formatGrillHour,
  nextSaturdayInSummer,
  parseLaDayString,
  validateEventInput,
} from './config';

// Five cross-field rules gate every grill event, shared by the two admin API
// routes and the authoring drawer, and none of them had a test. The module was
// never touched by the lib audit that covered its neighbours.
//
// Every rule-shape test passes `allowPastForEdit: true`. That is not laziness —
// without it the fixtures below would need to be dates in the future, which
// means the suite starts failing on its own the moment those dates pass. The
// first draft of this file did exactly that and failed within a month of being
// written. The past-date rule gets its own group, with dates computed relative
// to now so it stays honest.

type Input = Parameters<typeof validateEventInput>[0];

type Opts = { allowPastForEdit?: boolean };
const EDIT: Opts = { allowPastForEdit: true };
const fields = (input: Input, opts: Opts = EDIT) =>
  validateEventInput(input, opts).map((e) => e.field);
const messages = (input: Input, opts: Opts = EDIT) =>
  validateEventInput(input, opts).map((e) => e.message);

// Fixed calendar anchors, verified: 2026-07-04 is a Saturday, 2026-07-05 a
// Sunday, 2026-07-06 a Monday. All inside the June–September window.
const SAT = '2026-07-04';
const SUN = '2026-07-05';
const MON = '2026-07-06';

const valid: Input = { date: SAT, startHour: 10, endHour: 13 };

describe('validateEventInput — the happy path', () => {
  it('accepts a Saturday summer window of a legal length', () => {
    expect(validateEventInput(valid, EDIT)).toEqual([]);
  });

  it('accepts a Sunday too', () => {
    expect(validateEventInput({ ...valid, date: SUN }, EDIT)).toEqual([]);
  });
});

describe('validateEventInput — the date rules', () => {
  it('rejects a malformed date and stops there', () => {
    // Short-circuits: with no usable date the hour rules would report against a
    // NaN, which reads as noise rather than as the one real problem.
    expect(fields({ ...valid, date: 'not-a-date', startHour: 99 })).toEqual(['date']);
  });

  it('rejects a weekday', () => {
    expect(messages({ ...valid, date: MON })).toContain(
      'Grill events run on Saturdays and Sundays only.',
    );
  });

  it.each([
    ['2026-05-30', 'the Saturday before the window opens'],
    ['2026-10-03', 'the Saturday after it closes'],
    ['2026-01-03', 'deep winter'],
  ])('rejects %s (%s)', (date) => {
    expect(messages({ ...valid, date })).toContain(
      'Grill events run June 1 – September 30 only.',
    );
  });

  it('accepts weekend days at both edges of the window', () => {
    // 2026-06-06 and 2026-09-26 are both Saturdays, inside June–September.
    expect(validateEventInput({ ...valid, date: '2026-06-06' }, EDIT)).toEqual([]);
    expect(validateEventInput({ ...valid, date: '2026-09-26' }, EDIT)).toEqual([]);
  });
});

describe('validateEventInput — the past-date rule', () => {
  // Computed rather than hardcoded, so this group cannot rot.
  const futureSummerSaturday = nextSaturdayInSummer();

  it('rejects a date in the past when creating', () => {
    expect(messages({ ...valid, date: '2020-07-04' }, { allowPastForEdit: false })).toContain(
      'Event date cannot be in the past.',
    );
  });

  it('allows a past date when editing an existing event', () => {
    // An admin correcting the message on a finished event must not be blocked
    // by the date having since passed.
    expect(fields({ ...valid, date: '2020-07-04' }, EDIT)).not.toContain('date');
  });

  it('accepts a genuinely upcoming summer weekend with the rule enforced', () => {
    expect(
      validateEventInput(
        { ...valid, date: futureSummerSaturday },
        { allowPastForEdit: false },
      ),
    ).toEqual([]);
  });
});

describe('validateEventInput — the hour rules', () => {
  it.each([
    [9, 12, 'startHour'],
    [10, 16, 'endHour'],
  ])('rejects start=%s end=%s outside 10–15', (startHour, endHour, field) => {
    expect(fields({ ...valid, startHour, endHour })).toContain(field);
  });

  it('rejects a non-integer hour', () => {
    expect(fields({ ...valid, startHour: 10.5 })).toContain('startHour');
  });

  it('rejects an end at or before the start', () => {
    expect(messages({ ...valid, startHour: 12, endHour: 12 })).toContain(
      'End hour must be after start hour.',
    );
    expect(messages({ ...valid, startHour: 13, endHour: 11 })).toContain(
      'End hour must be after start hour.',
    );
  });

  it('rejects a window shorter than the minimum', () => {
    expect(messages({ ...valid, startHour: 10, endHour: 11 })).toContain(
      'Event window must be 2–5 hours.',
    );
  });

  it('accepts exactly the minimum and maximum durations', () => {
    expect(validateEventInput({ ...valid, startHour: 10, endHour: 12 }, EDIT)).toEqual([]);
    expect(validateEventInput({ ...valid, startHour: 10, endHour: 15 }, EDIT)).toEqual([]);
  });
});

describe('validateEventInput — the message cap', () => {
  it('accepts a message at the cap and rejects one past it', () => {
    expect(
      validateEventInput({ ...valid, message: 'x'.repeat(EVENT_MESSAGE_MAX) }, EDIT),
    ).toEqual([]);
    expect(fields({ ...valid, message: 'x'.repeat(EVENT_MESSAGE_MAX + 1) })).toContain('message');
  });

  it('treats an absent message as fine', () => {
    expect(validateEventInput({ ...valid, message: undefined }, EDIT)).toEqual([]);
  });
});

describe('parseLaDayString', () => {
  it('returns null for anything that is not YYYY-MM-DD', () => {
    for (const bad of ['', '2026-7-4', '07/04/2026', '2026-07-04T10:00', 'nope']) {
      expect(parseLaDayString(bad)).toBeNull();
    }
  });

  // Documenting a real limitation rather than asserting it is correct.
  //
  // The offset is hardcoded to 07:00Z, which is PDT (UTC-7). That is right for
  // every date the grill window admits — June through September is always
  // daylight time in Los Angeles — and wrong either side of it, where the zone
  // is PST (UTC-8). Harmless today only because `validateEventInput` rejects
  // those dates anyway. If the window is ever widened across a DST boundary,
  // this becomes a live off-by-one-hour bug.
  it('anchors a summer date at 07:00Z, which is PDT', () => {
    expect(parseLaDayString('2026-07-04')?.toISOString()).toBe('2026-07-04T07:00:00.000Z');
  });

  it('uses the same PDT offset for a winter date, which is wrong but unreachable', () => {
    // PST would be 08:00Z. Pinned so that widening the window fails loudly here
    // rather than quietly shifting every out-of-season event by an hour.
    expect(parseLaDayString('2026-01-04')?.toISOString()).toBe('2026-01-04T07:00:00.000Z');
  });
});

describe('nextSaturdayInSummer', () => {
  const isSaturdayInSummer = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 6 && m >= 6 && m <= 9;
  };

  it.each([
    ['2026-06-10T19:00:00.000Z', 'mid-June, a Wednesday'],
    ['2026-01-15T19:00:00.000Z', 'January — before the window opens'],
    ['2026-11-15T19:00:00.000Z', 'November — after it closes'],
  ])('returns a Saturday inside the window from %s (%s)', (iso) => {
    expect(isSaturdayInSummer(nextSaturdayInSummer(new Date(iso)))).toBe(true);
  });

  // The `i > 0` guard: asked on a summer Saturday it skips to the following
  // week rather than offering today. Same-day events validate fine, so the
  // suggestion is more conservative than the rules require. Pinned as current
  // behaviour, not endorsed — if the drawer ever wants today, this is the line.
  it('skips today when today is already a Saturday in the window', () => {
    const saturdayNoonLa = new Date('2026-07-04T19:00:00.000Z');
    expect(nextSaturdayInSummer(saturdayNoonLa)).not.toBe('2026-07-04');
    expect(isSaturdayInSummer(nextSaturdayInSummer(saturdayNoonLa))).toBe(true);
  });

  it('always suggests a date its own validator accepts', () => {
    // The suggestion feeding the drawer must never be one the server refuses.
    for (const day of ['2026-06-10', '2026-08-20', '2026-09-28']) {
      const key = nextSaturdayInSummer(new Date(`${day}T19:00:00.000Z`));
      expect(validateEventInput({ date: key, startHour: 10, endHour: 13 }, EDIT)).toEqual([]);
    }
  });
});

describe('formatGrillHour', () => {
  it.each([
    [10, '10 AM'],
    [11, '11 AM'],
    [12, '12 PM'],
    [13, '1 PM'],
    [15, '3 PM'],
  ])('formats %s as %s', (h, out) => {
    expect(formatGrillHour(h)).toBe(out);
  });
});
