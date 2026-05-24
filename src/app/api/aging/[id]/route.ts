import { NextResponse } from 'next/server';
import AgingCut from '@/models/AgingCut';
import {
  parseObjectId,
  withAdminNonDemo,
  zodBadRequest,
} from '@/lib/api-handler';
import { agingPatchSchema } from '@/lib/aging/schema';

export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const parsed = agingPatchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid aging input');

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

export const DELETE = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const removed = await AgingCut.findByIdAndDelete(id);
    if (!removed) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: { id }, message: 'Aging cut deleted' });
  } catch (error) {
    console.error('[aging/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
