import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import Shift from '@/models/Shift';
import { withAdminNonDemo } from '@/lib/api-handler';
import { findShiftCollision } from '@/lib/shifts';
import { shiftPatchSchema, type ShiftPatchInput } from '@/lib/shifts/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = shiftPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    // Strip undefined keys so Mongoose's `$set` doesn't interpret them as
    // a request to clear those fields. Building a typed partial here means
    // the collision check below reads the fields without casts.
    const data = parsed.data;
    const update: Partial<ShiftPatchInput> = {};
    if (data.staffName !== undefined) update.staffName = data.staffName;
    if (data.role !== undefined) update.role = data.role;
    if (data.color !== undefined) update.color = data.color;
    if (data.dayOfWeek !== undefined) update.dayOfWeek = data.dayOfWeek;
    if (data.hourIndex !== undefined) update.hourIndex = data.hourIndex;

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

export const DELETE = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

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
