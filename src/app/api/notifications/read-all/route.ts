import { NextResponse } from 'next/server';
import connectDB from '@/config/database';
import Notification from '@/models/Notification';
import { getSessionUser } from '@/utils/getSessionUser';

// PATCH /api/notifications/read-all — mark all as read for the session admin
export const PATCH = async () => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!sessionUser.user?.isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    await Notification.updateMany(
      { userId: sessionUser.userId, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[notifications/read-all PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
