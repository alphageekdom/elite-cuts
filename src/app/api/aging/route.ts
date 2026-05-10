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
    const cut = await AgingCut.create({ cut: cutName, targetDays, rack, weightLb, startedAt, isActive });
    return NextResponse.json(cut, { status: 201 });
  } catch (error) {
    console.error('[aging POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
