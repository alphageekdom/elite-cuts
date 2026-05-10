import { NextResponse } from 'next/server';
import AgingCut from '@/models/AgingCut';
import { withAdmin } from '@/lib/api-handler';

export const GET = withAdmin(async () => {
  try {
    const cuts = await AgingCut.find({}).sort({ startedAt: 1 }).lean();
    return NextResponse.json(cuts);
  } catch (error) {
    console.error('[aging GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdmin(async (request) => {
  try {
    const { cut: cutName, targetDays, rack, weightLb, startedAt, isActive } = await request.json();

    if (!cutName || typeof cutName !== 'string' || cutName.trim().length === 0 || cutName.length > 100) {
      return NextResponse.json({ message: 'cut name is required (max 100 chars)' }, { status: 400 });
    }
    if (!startedAt || isNaN(new Date(startedAt).getTime())) {
      return NextResponse.json({ message: 'startedAt must be a valid date' }, { status: 400 });
    }

    const cut = await AgingCut.create({ cut: cutName.trim(), targetDays, rack, weightLb, startedAt, isActive });
    return NextResponse.json(cut, { status: 201 });
  } catch (error) {
    console.error('[aging POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
