import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import AgingCut from '@/models/AgingCut';
import { withAdminNonDemo } from '@/lib/api-handler';
import { agingPatchSchema } from '@/lib/aging/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const parsed = agingPatchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid aging input' },
        { status: 400 },
      );
    }
    const cut = await AgingCut.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!cut) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: cut });
  } catch (error) {
    console.error('[aging/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
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
