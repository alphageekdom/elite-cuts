import { NextResponse } from 'next/server';
import AgingCut from '@/models/AgingCut';
import { withAdmin, withAdminNonDemo, zodBadRequest } from '@/lib/api-handler';
import { agingCreateSchema } from '@/lib/aging/schema';

export const GET = withAdmin(async () => {
  try {
    const items = await AgingCut.find({}).sort({ startedAt: 1 }).lean();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[aging GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdminNonDemo(async (request) => {
  try {
    const parsed = agingCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid aging input');

    const cut = await AgingCut.create(parsed.data);
    return NextResponse.json({ data: cut }, { status: 201 });
  } catch (error) {
    console.error('[aging POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
