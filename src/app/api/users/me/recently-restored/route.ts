import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';

// GET /api/users/me/recently-restored — one-shot helper for the Login form.
// Returns true if a `self_restore` audit entry was written for this user in
// the past 60 seconds, which lets the client show the cancellation toast
// after a sign-in that came in through a soft-deleted account.
export const GET = withAuth(async (_req: NextRequest, _ctx, userId) => {
  try {
    const cutoff = new Date(Date.now() - 60_000);
    const entry = await AccountDeletionAudit.findOne({
      userId,
      action: 'self_restore',
      performedAt: { $gte: cutoff },
    })
      .sort({ performedAt: -1 })
      .lean();

    return NextResponse.json({ recentlyRestored: Boolean(entry) });
  } catch (error) {
    console.error('[users/me/recently-restored GET]', error);
    return NextResponse.json({ recentlyRestored: false });
  }
});
