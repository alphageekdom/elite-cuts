import { NextResponse } from 'next/server';

import Shift from '@/models/Shift';
import {
  parseObjectId,
  pickDefined,
  withAdmin,
  zodBadRequest,
} from '@/lib/api-handler';
import { findShiftCollision } from '@/lib/shifts/queries';
import { shiftPatchSchema, type ShiftPatchInput } from '@/lib/shifts/schema';

const SHIFT_PATCH_KEYS = [
  'staffName',
  'role',
  'color',
  'dayOfWeek',
  'hourIndex',
] as const satisfies readonly (keyof ShiftPatchInput)[];

export const PATCH = withAdmin<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const body = await request.json().catch(() => ({}));
    const parsed = shiftPatchSchema.safeParse(body);
    if (!parsed.success) return zodBadRequest(parsed.error);

    // pickDefined strips `undefined` keys so Mongoose's `$set` doesn't
    // interpret them as a request to clear those fields.
    const update = pickDefined(parsed.data, SHIFT_PATCH_KEYS);

    // If the cell address (dayOfWeek / hourIndex) is moving, check the
    // destination is free. The shift's weekStart never changes here — moving
    // a shift to a different week is out of scope for this phase.
    if (update.dayOfWeek !== undefined || update.hourIndex !== undefined) {
      const current = await Shift.findById(id).select('weekStart dayOfWeek hourIndex').lean<{
        weekStart: Date;
        dayOfWeek: number;
        hourIndex: number;
      } | null>();
      if (!current) {
        return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
      }
      const collision = await findShiftCollision({
        weekStart: current.weekStart,
        dayOfWeek: update.dayOfWeek ?? current.dayOfWeek,
        hourIndex: update.hourIndex ?? current.hourIndex,
        excludeId: id,
      });
      if (collision) {
        return NextResponse.json(
          { message: 'Another shift is already in that slot', conflict: collision },
          { status: 409 },
        );
      }
    }

    const updated = await Shift.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) {
      return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[shifts/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdmin<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const removed = await Shift.findByIdAndDelete(id);
    if (!removed) {
      return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json({ data: { id }, message: 'Deleted' });
  } catch (error) {
    console.error('[shifts/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
