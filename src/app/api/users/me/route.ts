import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { softDeleteUser } from '@/lib/accountDeletion';
import User from '@/models/User';
import { refuseDemoActor } from '@/lib/auth/demo-permissions';

// DELETE /api/users/me — customer-initiated soft delete. Schedules the account
// for hard-deletion in 30 days; signing back in cancels.
export const DELETE = withAuth(async (_req: NextRequest, _ctx, userId) => {
  try {
    const user = await User.findById(userId).select('isAdmin isDemo');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (user.isAdmin) {
      return NextResponse.json({ message: 'Admin accounts cannot be self-deleted' }, { status: 403 });
    }
    const demoBlocked = refuseDemoActor(user);
    if (demoBlocked) return demoBlocked;

    const { deletionScheduledFor } = await softDeleteUser(userId, { actor: 'self' });

    return NextResponse.json({
      message: 'Account scheduled for deletion',
      deletionScheduledFor: deletionScheduledFor.toISOString(),
    });
  } catch (error) {
    console.error('[users/me DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
