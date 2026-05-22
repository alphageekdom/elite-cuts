import { MONTH_ABBR } from '@/lib/format';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export type RangeKey = '7D' | '30D' | '90D' | '1Y';

export const ALLOWED_RANGES = ['7D', '30D', '90D', '1Y'] as const satisfies readonly RangeKey[];

export const RANGE_DAYS: Record<RangeKey, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 360,
};

export type BucketUnit = 'Day' | 'Week' | 'Biweekly' | 'Monthly';
export type BucketCfg = { count: number; sizeDays: number; unit: BucketUnit };

export const RANGE_BUCKETS: Record<RangeKey, BucketCfg> = {
  '7D':  { count: 7,  sizeDays: 1,  unit: 'Day' },
  '30D': { count: 5,  sizeDays: 6,  unit: 'Week' },
  '90D': { count: 6,  sizeDays: 15, unit: 'Biweekly' },
  '1Y':  { count: 12, sizeDays: 30, unit: 'Monthly' },
};

export function parseRange(raw: string | null | undefined): RangeKey {
  if (!raw) return '30D';
  const upper = raw.toUpperCase();
  return (ALLOWED_RANGES as readonly string[]).includes(upper)
    ? (upper as RangeKey)
    : '30D';
}

// For endpoints that need to distinguish "no range filter" from the default —
// returns null on absent or invalid input instead of falling through to '30D'.
export function parseOptionalRange(raw: string | null | undefined): RangeKey | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return (ALLOWED_RANGES as readonly string[]).includes(upper)
    ? (upper as RangeKey)
    : null;
}

export type RangeBucket = { label: string; value: number; prevValue: number };
export type BucketSource = { createdAt: Date; totalCost: number };

// Every branch labels from `bStart` so the unit reads consistently across Day,
// Biweekly, and Monthly — the prior `Day` branch labeled from `bEnd` and was
// the one outlier.
export function buildRangeBuckets(
  range: RangeKey,
  now: Date,
  current: readonly BucketSource[],
  previous: readonly BucketSource[],
): RangeBucket[] {
  const cfg = RANGE_BUCKETS[range];
  const days = RANGE_DAYS[range];
  const out: RangeBucket[] = [];

  for (let i = cfg.count - 1; i >= 0; i--) {
    const bEnd = new Date(now.getTime() - i * cfg.sizeDays * DAY_MS);
    const bStart = new Date(bEnd.getTime() - cfg.sizeDays * DAY_MS);
    const prevEnd = new Date(bEnd.getTime() - days * DAY_MS);
    const prevStart = new Date(bStart.getTime() - days * DAY_MS);

    let label: string;
    if (cfg.unit === 'Day') {
      label = WEEKDAY_ABBR[bStart.getDay()];
    } else if (cfg.unit === 'Week') {
      label = `WK ${cfg.count - i}`;
    } else if (cfg.unit === 'Monthly') {
      label = MONTH_ABBR[bStart.getMonth()];
    } else {
      label = `${MONTH_ABBR[bStart.getMonth()]} ${bStart.getDate()}`;
    }

    out.push({
      label,
      value: current
        .filter((o) => o.createdAt >= bStart && o.createdAt < bEnd)
        .reduce((s, o) => s + o.totalCost, 0),
      prevValue: previous
        .filter((o) => o.createdAt >= prevStart && o.createdAt < prevEnd)
        .reduce((s, o) => s + o.totalCost, 0),
    });
  }

  return out;
}
