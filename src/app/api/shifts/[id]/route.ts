import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import Shift, { SHIFT_COLORS, type ShiftColor } from '@/models/Shift';
import { withAdmin } from '@/lib/api-handler';
import { findShiftCollision } from '@/lib/shifts';

type RouteContext = { params: Promise<{ id: string }> };

type ShiftPatchBody = {
  staffName?: string;
  role?: string;
  color?: string;
  dayOfWeek?: number;
  hourIndex?: number;
};

export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as ShiftPatchBody;

    const update: Record<string, unknown> = {};

    if (body.staffName !== undefined) {
      const trimmed = body.staffName.trim();
      if (!trimmed) {
        return NextResponse.json({ message: 'staffName cannot be empty' }, { status: 400 });
      }
      update.staffName = trimmed;
    }

    if (body.role !== undefined) {
      update.role = body.role.trim();
    }

    if (body.color !== undefined) {
      if (!SHIFT_COLORS.includes(body.color as ShiftColor)) {
        return NextResponse.json({ message: 'color is not a recognized value' }, { status: 400 });
      }
      update.color = body.color;
    }

    if (body.dayOfWeek !== undefined) {
      if (!Number.isInteger(body.dayOfWeek) || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
        return NextResponse.json({ message: 'dayOfWeek must be an integer 0–6' }, { status: 400 });
      }
      update.dayOfWeek = body.dayOfWeek;
    }

    if (body.hourIndex !== undefined) {
      if (!Number.isInteger(body.hourIndex) || body.hourIndex < 0 || body.hourIndex > 8) {
        return NextResponse.json({ message: 'hourIndex must be an integer 0–8' }, { status: 400 });
      }
      update.hourIndex = body.hourIndex;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: 'No editable fields supplied' }, { status: 400 });
    }

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
        dayOfWeek: (update.dayOfWeek as number | undefined) ?? current.dayOfWeek,
        hourIndex: (update.hourIndex as number | undefined) ?? current.hourIndex,
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
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[shifts/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const removed = await Shift.findByIdAndDelete(id);
    if (!removed) {
      return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[shifts/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
