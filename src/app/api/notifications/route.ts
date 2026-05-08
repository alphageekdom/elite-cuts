import { NextResponse } from 'next/server';
import connectDB from '@/config/database';
import Notification from '@/models/Notification';
import { getSessionUser } from '@/utils/getSessionUser';

export const dynamic = 'force-dynamic';

// GET /api/notifications — 20 most recent for the session admin
export const GET = async () => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!sessionUser.user?.isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const notifications = await Notification.find({ userId: sessionUser.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: sessionUser.userId,
      readAt: null,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[notifications GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
