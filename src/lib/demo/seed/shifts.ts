import { mondayOfShopDay } from '@/lib/shifts/schedule';
import { shopDateKey } from '@/lib/shop-settings/pickup-format';

import type { Shift } from '@/models/Shift';

// Seed shape: shifts without `weekStart` (that's runtime-computed at
// restore time so the demo always shows the *current* week, never a
// stale one from when the seed module was written).
export type DemoShiftSeed = Omit<Shift, 'weekStart' | 'createdAt' | 'updatedAt'>;

// A realistic week of shifts — Tue–Sun, with Mon closed per the default
// shop hours. Pulled verbatim from scripts/seed.mjs. dayOfWeek 1=Tue …
// 6=Sun, hourIndex 0=8AM … 8=4PM. Each (dayOfWeek, hourIndex) is unique
// (Shift's compound unique index enforces this at the DB layer).
export const DEMO_SHIFTS: DemoShiftSeed[] = [
  // Tuesday — receiving + opening + lunch + close
  { dayOfWeek: 1, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 1, hourIndex: 1, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 1, hourIndex: 2, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 1, hourIndex: 3, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 4, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 5, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 1, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Wednesday
  { dayOfWeek: 2, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 2, hourIndex: 1, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 2, hourIndex: 2, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 2, hourIndex: 3, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 2, hourIndex: 4, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 2, hourIndex: 5, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 2, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 2, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Thursday — Carlos morning delivery
  { dayOfWeek: 3, hourIndex: 0, staffName: 'Carlos Mendez', role: 'Delivery',     color: 'delivery' },
  { dayOfWeek: 3, hourIndex: 1, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 3, hourIndex: 2, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 3, hourIndex: 3, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 3, hourIndex: 4, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 3, hourIndex: 5, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 3, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Friday — busiest weekday, includes a closing hour
  { dayOfWeek: 4, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 4, hourIndex: 1, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 4, hourIndex: 2, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 4, hourIndex: 3, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 4, hourIndex: 4, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 4, hourIndex: 5, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 4, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 4, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 4, hourIndex: 8, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Saturday — Carlos delivery + full crew
  { dayOfWeek: 5, hourIndex: 0, staffName: 'Carlos Mendez', role: 'Delivery',     color: 'delivery' },
  { dayOfWeek: 5, hourIndex: 1, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 5, hourIndex: 2, staffName: 'Tomás Reyes',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 5, hourIndex: 3, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 4, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 5, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 5, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Sunday — short hours, mid-day crew only
  { dayOfWeek: 6, hourIndex: 2, staffName: 'Marcus Vega',   role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 6, hourIndex: 3, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 6, hourIndex: 4, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 6, hourIndex: 5, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 6, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 6, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
];

// Returns the Monday-at-UTC-midnight for the week the SHOP is currently in.
// Matches the `normalizeWeekStart` shape the shift API uses so the unique
// compound index `(weekStart, dayOfWeek, hourIndex)` won't double-insert
// against already-existing rows on a re-run.
//
// Shares `mondayOfShopDay` with the API and the admin pages rather than
// deriving a Monday a third way — the three used to be able to disagree, and
// the local-then-snap-to-UTC shape this replaces produced a SUNDAY key on any
// runtime east of UTC.
//
// Takes the shop's zone rather than reading the server's calendar date: the
// pages that render this week all key off `shopDateKey`, so a restore that
// keyed off the runtime instead planted the whole roster in the FOLLOWING week
// whenever the two disagreed — between 5pm and midnight Pacific on a Sunday,
// on a UTC deploy, which then rendered an empty schedule until shop-Monday.
export function currentWeekStartUtc(
  timezone: string,
  now: Date = new Date(),
): Date {
  return mondayOfShopDay(shopDateKey(timezone, now));
}
