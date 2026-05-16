import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';

// GET /api/users/me/recently-restored — one-shot helper for the Login form.
// Reports both lifecycle clears that can happen at sign-in:
//   - `recentlyRestored`: a soft-deleted account was reactivated
//   - `recentlyDormancyCleared`: a dormancy warning was cleared by activity
// The client uses the first true flag to pick the right welcome-back surface.
// Both windows are 60 seconds so a slightly slow probe still picks them up.
export const GET = withAuth(async (_req: NextRequest, _ctx, userId) => {
  try {
    const cutoff = new Date(Date.now() - 60_000);
    const recent = await AccountDeletionAudit.find({
      userId,
      action: { $in: ['self_restore', 'self_dormancy_cleared'] },
      performedAt: { $gte: cutoff },
    })
      .select('action')
      .lean<{ action: string }[]>();

    const actions = new Set(recent.map((r) => r.action));
    return NextResponse.json({
      recentlyRestored: actions.has('self_restore'),
      recentlyDormancyCleared: actions.has('self_dormancy_cleared'),
    });
  } catch (error) {
    console.error('[users/me/recently-restored GET]', error);
    return NextResponse.json({
      recentlyRestored: false,
      recentlyDormancyCleared: false,
    });
  }
});
