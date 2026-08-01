import { NextResponse } from 'next/server';

import Shift from '@/models/Shift';
import { withAdmin, zodBadRequest } from '@/lib/api-handler';
import { mondayOfShopDay } from '@/lib/shifts/schedule';
import { shopDateKey } from '@/lib/shop-settings/pickup-format';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { findShiftCollision, normalizeWeekStart } from '@/lib/shifts/queries';
import { shiftCreateSchema } from '@/lib/shifts/schema';

export const GET = withAdmin(async (request) => {
  try {
    const weekStartParam = request.nextUrl.searchParams.get('weekStart');
    // The omitted-param fallback resolves against the SHOP's calendar day. It
    // used to read the runtime's, which on a UTC deploy serving a Pacific shop
    // returned next week for every Sunday-evening call. No in-app caller omits
    // the parameter today, but this is the documented endpoint for future
    // clients, and it is the last place a week key could come from a clock
    // that isn't the shop's.
    const { timezone } = await getShopSettings();
    const weekStart = normalizeWeekStart(
      weekStartParam
        ? new Date(weekStartParam)
        : mondayOfShopDay(shopDateKey(timezone, new Date())),
    );
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const items = await Shift.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[shifts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdmin(async (request) => {
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
