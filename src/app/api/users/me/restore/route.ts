import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { restoreUser } from '@/lib/accountDeletion';

// POST /api/users/me/restore — explicit self-restore. Largely redundant with
// the sign-in restore path (authorize() auto-clears deletion fields), but
// keeps a no-UI fallback for support tooling.
export const POST = withAuth(async (_req: NextRequest, _ctx, userId) => {
  try {
    await restoreUser(userId, { actor: 'self' });
    return NextResponse.json({ message: 'Account restored' });
  } catch (error) {
    console.error('[users/me/restore POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
