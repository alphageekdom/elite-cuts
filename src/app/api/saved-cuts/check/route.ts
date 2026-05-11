import { NextResponse, type NextRequest } from 'next/server';

import User from '@/models/User';
import { withAuth } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// POST /api/saved-cuts/check
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const { productId } = (await request.json()) as { productId?: string };

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    const user = await User.findById(userId, 'savedCuts');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isBookmarked = user.savedCuts.some((id) => String(id) === productId);

    return NextResponse.json({ isBookmarked });
  } catch (error) {
    console.error('[saved-cuts/check POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
