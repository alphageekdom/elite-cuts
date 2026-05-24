import { NextResponse } from 'next/server';

import Shift from '@/models/Shift';
import { withAdmin, withAdminNonDemo, zodBadRequest } from '@/lib/api-handler';
import { getMondayOf } from '@/lib/schedule-utils';
import { findShiftCollision, normalizeWeekStart } from '@/lib/shifts';
import { shiftCreateSchema } from '@/lib/shifts/schema';

export const GET = withAdmin(async (request) => {
  try {
    const weekStartParam = request.nextUrl.searchParams.get('weekStart');
    const weekStart = normalizeWeekStart(weekStartParam ? new Date(weekStartParam) : getMondayOf(new Date()));
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const items = await Shift.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[shifts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdminNonDemo(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = shiftCreateSchema.safeParse(body);
    if (!parsed.success) return zodBadRequest(parsed.error);

    const { weekStart, dayOfWeek, hourIndex, staffName, role, color } = parsed.data;
    const weekStartDate = normalizeWeekStart(new Date(weekStart));

    const collision = await findShiftCollision({
      weekStart: weekStartDate,
      dayOfWeek,
      hourIndex,
    });
    if (collision) {
      return NextResponse.json(
        { message: 'Another shift is already in that slot', conflict: collision },
        { status: 409 },
      );
    }

    const shift = await Shift.create({
      weekStart: weekStartDate,
      dayOfWeek,
      hourIndex,
      staffName,
      role,
      color,
    });
    return NextResponse.json({ data: shift }, { status: 201 });
  } catch (error) {
    console.error('[shifts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
