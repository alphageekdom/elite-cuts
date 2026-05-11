import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import MessageModel, { MESSAGE_STATUSES } from '@/models/Message';
import { withAdmin } from '@/lib/api-handler';

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/messages/[id] — admin-only status toggle
export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { status } = body as { status: string };

    if (!status || !(MESSAGE_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const updated = await MessageModel.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('[messages PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
