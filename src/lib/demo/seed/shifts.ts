import type { Shift } from '@/models/Shift';

// Seed shape: shifts without `weekStart` (that's runtime-computed at
// restore time so the demo always shows the *current* week, never a
// stale one from when the seed module was written).
export type DemoShiftSeed = Omit<Shift, 'weekStart'>;

// A realistic week of shifts — Tue–Sun, with Mon closed per the default
// shop hours. Pulled verbatim from scripts/seed.mjs. dayOfWeek 1=Tue …
// 6=Sun, hourIndex 0=8AM … 8=4PM. Each (dayOfWeek, hourIndex) is unique
// (Shift's compound unique index enforces this at the DB layer).
export const DEMO_SHIFTS: DemoShiftSeed[] = [
  // Tuesday — receiving + opening + lunch + close
  { dayOfWeek: 1, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 1, hourIndex: 1, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 1, hourIndex: 2, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 1, hourIndex: 3, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 4, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 5, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 1, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 1, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Wednesday
  { dayOfWeek: 2, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 2, hourIndex: 1, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 2, hourIndex: 2, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 2, hourIndex: 3, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 2, hourIndex: 4, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 2, hourIndex: 5, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 2, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 2, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Thursday — Carlos morning delivery
  { dayOfWeek: 3, hourIndex: 0, staffName: 'Carlos Mendez', role: 'Delivery',     color: 'delivery' },
  { dayOfWeek: 3, hourIndex: 1, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 3, hourIndex: 2, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 3, hourIndex: 3, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 3, hourIndex: 4, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 3, hourIndex: 5, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 3, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Friday — busiest weekday, includes a closing hour
  { dayOfWeek: 4, hourIndex: 0, staffName: 'Elena Huang',   role: 'Receiving',    color: 'elena' },
  { dayOfWeek: 4, hourIndex: 1, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 4, hourIndex: 2, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 4, hourIndex: 3, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 4, hourIndex: 4, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 4, hourIndex: 5, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 4, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 4, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 4, hourIndex: 8, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Saturday — Carlos delivery + full crew
  { dayOfWeek: 5, hourIndex: 0, staffName: 'Carlos Mendez', role: 'Delivery',     color: 'delivery' },
  { dayOfWeek: 5, hourIndex: 1, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 5, hourIndex: 2, staffName: 'Tangelo Doe',   role: 'Head butcher', color: 'tangelo' },
  { dayOfWeek: 5, hourIndex: 3, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 4, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 5, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 5, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 5, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },

  // Sunday — short hours, mid-day crew only
  { dayOfWeek: 6, hourIndex: 2, staffName: 'Marcus Reyes',  role: 'Charcuterie',  color: 'marcus' },
  { dayOfWeek: 6, hourIndex: 3, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 6, hourIndex: 4, staffName: 'Maya Park',     role: 'Apprentice',   color: 'maya' },
  { dayOfWeek: 6, hourIndex: 5, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 6, hourIndex: 6, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
  { dayOfWeek: 6, hourIndex: 7, staffName: 'Sam Okafor',    role: 'Counter',      color: 'sam' },
];

// Returns the Monday-at-UTC-midnight for the week containing `now`. Matches
// the `normalizeWeekStart` shape the shift API uses so the unique compound
// index `(weekStart, dayOfWeek, hourIndex)` won't double-insert against
// already-existing rows on a re-run.
export function currentWeekStartUtc(now: Date = new Date()): Date {
  const dow = now.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  const localMonday = new Date(now);
  localMonday.setDate(now.getDate() - offset);
  return new Date(
    Date.UTC(
      localMonday.getFullYear(),
      localMonday.getMonth(),
      localMonday.getDate(),
    ),
  );
}
