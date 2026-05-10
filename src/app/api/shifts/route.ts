import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shift from '@/models/Shift';
import { withAdmin } from '@/lib/api-handler';

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
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ message: 'dayOfWeek must be an integer 0–6' }, { status: 400 });
    }
    if (!Number.isInteger(hourIndex) || hourIndex < 0) {
      return NextResponse.json({ message: 'hourIndex must be a non-negative integer' }, { status: 400 });
    }
    if (typeof staffName !== 'string' || !staffName.trim()) {
      return NextResponse.json({ message: 'staffName is required' }, { status: 400 });
    }

    const shift = await Shift.create({ weekStart, dayOfWeek, hourIndex, staffName, role, color });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('[shifts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (request) => {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    await Shift.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[shifts DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
