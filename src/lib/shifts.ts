import 'server-only';
import type { Types } from 'mongoose';

import Shift from '@/models/Shift';

export type ShiftSlot = {
  weekStart: Date;
  dayOfWeek: number;
  hourIndex: number;
};

// Snap a weekStart Date to UTC midnight of its calendar date so that a client
// sending local-midnight Monday (e.g. `2026-05-11T07:00:00Z` from PDT) and a
// client sending UTC-midnight Monday (`2026-05-11T00:00:00Z`) both land on
// the same stored value. Without this normalization the unique compound
// index `(weekStart, dayOfWeek, hourIndex)` doesn't fire because the two
// timestamps differ.
export function normalizeWeekStart(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : new Date(input.getTime());
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type ShiftCollision = {
  _id: string;
  weekStart: string;
  dayOfWeek: number;
  hourIndex: number;
  staffName: string;
};

type CheckArgs = ShiftSlot & {
  excludeId?: string;
};

// Returns the conflicting shift if another shift already occupies this
// (weekStart, dayOfWeek, hourIndex) slot, or null if the slot is free.
// Caller is expected to translate a non-null result into a 409 response.
export async function findShiftCollision(args: CheckArgs): Promise<ShiftCollision | null> {
  const filter: Record<string, unknown> = {
    weekStart: args.weekStart,
    dayOfWeek: args.dayOfWeek,
    hourIndex: args.hourIndex,
  };
  if (args.excludeId) filter._id = { $ne: args.excludeId };

  const existing = await Shift.findOne(filter).select('_id weekStart dayOfWeek hourIndex staffName').lean<{
    _id: Types.ObjectId;
    weekStart: Date;
    dayOfWeek: number;
    hourIndex: number;
    staffName: string;
  } | null>();

  if (!existing) return null;

  return {
    _id: existing._id.toString(),
    weekStart: existing.weekStart.toISOString(),
    dayOfWeek: existing.dayOfWeek,
    hourIndex: existing.hourIndex,
    staffName: existing.staffName,
  };
}
