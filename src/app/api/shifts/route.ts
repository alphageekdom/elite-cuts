import { NextResponse } from 'next/server';

import Shift, { SHIFT_COLORS, type ShiftColor } from '@/models/Shift';
import { withAdmin } from '@/lib/api-handler';
import { getMondayOf } from '@/lib/schedule-utils';
import { findShiftCollision } from '@/lib/shifts';

export const GET = withAdmin(async (request) => {
  try {
    const weekStartParam = request.nextUrl.searchParams.get('weekStart');
    const weekStart = weekStartParam ? new Date(weekStartParam) : getMondayOf(new Date());
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const shifts = await Shift.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean();
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('[shifts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdmin(async (request) => {
  try {
    const { weekStart, dayOfWeek, hourIndex, staffName, role, color } = await request.json();

    if (!weekStart) {
      return NextResponse.json({ message: 'weekStart is required' }, { status: 400 });
    }
    const weekStartDate = new Date(weekStart);
    if (Number.isNaN(weekStartDate.getTime())) {
      return NextResponse.json({ message: 'weekStart is not a valid date' }, { status: 400 });
    }
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ message: 'dayOfWeek must be an integer 0–6' }, { status: 400 });
    }
    if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 8) {
      return NextResponse.json({ message: 'hourIndex must be an integer 0–8' }, { status: 400 });
    }
    if (typeof staffName !== 'string' || !staffName.trim()) {
      return NextResponse.json({ message: 'staffName is required' }, { status: 400 });
    }
    if (color !== undefined && !SHIFT_COLORS.includes(color as ShiftColor)) {
      return NextResponse.json({ message: 'color is not a recognized value' }, { status: 400 });
    }

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
      staffName: staffName.trim(),
      role,
      color,
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('[shifts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
