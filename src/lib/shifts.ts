import 'server-only';
import type { Types } from 'mongoose';

import Shift from '@/models/Shift';

export type ShiftSlot = {
  weekStart: Date;
  dayOfWeek: number;
  hourIndex: number;
};

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
