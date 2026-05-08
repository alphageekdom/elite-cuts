import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import Shift from '@/models/Shift';
import { requireAdmin } from '@/utils/requireAdmin';

// GET /api/shifts?weekStart=ISO — shifts for one week
export const GET = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const weekStartParam = request.nextUrl.searchParams.get('weekStart');
    const weekStart = weekStartParam ? new Date(weekStartParam) : getMondayOf(new Date());
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const shifts = await Shift.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean();
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('[shifts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/shifts — create a shift
export const POST = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const body = await request.json();
    const shift = await Shift.create(body);
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('[shifts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/shifts?id=xxx — remove a shift
export const DELETE = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    await Shift.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[shifts DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
