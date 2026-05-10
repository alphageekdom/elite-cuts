import { NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import { withAdmin } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// GET /api/notifications — 20 most recent for the session admin
export const GET = withAdmin(async (_req, userId) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Notification.countDocuments({ userId, readAt: null }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[notifications GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
