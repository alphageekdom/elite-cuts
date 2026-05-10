import { NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import { withAdmin } from '@/lib/api-handler';

export const PATCH = withAdmin(async (_req, _ctx, userId) => {
  try {
    await Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[notifications/read-all PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
