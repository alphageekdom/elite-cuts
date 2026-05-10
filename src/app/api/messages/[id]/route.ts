import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/config/database';
import MessageModel, { MESSAGE_STATUSES } from '@/models/Message';
import { getSessionUser } from '@/utils/getSessionUser';

// PATCH /api/messages/[id] — admin-only status toggle
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!sessionUser.user?.isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { status } = body as { status: string };

    if (!status || !(MESSAGE_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

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
};
