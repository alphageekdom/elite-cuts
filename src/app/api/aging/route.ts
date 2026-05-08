import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import AgingCut from '@/models/AgingCut';
import { requireAdmin } from '@/utils/requireAdmin';

export const GET = async () => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const cuts = await AgingCut.find({ isActive: true }).sort({ startedAt: 1 }).lean();
    return NextResponse.json(cuts);
  } catch (error) {
    console.error('[aging GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const { cut: cutName, targetDays, rack, weightLb, startedAt, isActive } = await request.json();
    const cut = await AgingCut.create({ cut: cutName, targetDays, rack, weightLb, startedAt, isActive });
    return NextResponse.json(cut, { status: 201 });
  } catch (error) {
    console.error('[aging POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
