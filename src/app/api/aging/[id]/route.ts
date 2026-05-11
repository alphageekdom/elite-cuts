import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import AgingCut from '@/models/AgingCut';
import { withAdmin } from '@/lib/api-handler';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { cut: cutName, targetDays, rack, weightLb, startedAt, isActive } = await request.json();
    const patch = { cut: cutName, targetDays, rack, weightLb, startedAt, isActive };
    const cut = await AgingCut.findByIdAndUpdate(id, { $set: patch }, { returnDocument: 'after', runValidators: true });
    if (!cut) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(cut);
  } catch (error) {
    console.error('[aging/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    await AgingCut.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[aging/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
