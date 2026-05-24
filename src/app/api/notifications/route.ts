import { NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import { withAdmin } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// GET /api/notifications — 20 most recent for the session admin. The
// `unreadCount` is an extra envelope key per the project convention's
// "extras ride as additional keys on the same envelope" rule, alongside
// `items` / `total`.
export const GET = withAdmin(async (_req, _ctx, userId) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Notification.countDocuments({ userId, readAt: null }),
    ]);

    return NextResponse.json({ items, total: items.length, unreadCount });
  } catch (error) {
    console.error('[notifications GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
