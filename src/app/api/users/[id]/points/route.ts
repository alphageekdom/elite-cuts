import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import { withAdminNonDemo } from '@/lib/api-handler';
import { refuseDemoTarget } from '@/lib/auth/demo-responses';

type RouteContext = { params: Promise<{ id: string }> };

// Sized to a clearly-not-real ceiling so a typo or tampered request can't
// silently inflate a balance to "comp an unlimited series of orders" levels.
// The redemption flow caps per-order separately; this is the outer rail on
// the admin-grant primitive itself.
const POINTS_DELTA_LIMIT = 1_000_000;

// PATCH /api/users/:id/points — admin-only reward points adjustment.
// Body: { delta: number } — positive to add, negative to subtract.
// Points floor at 0; delta is capped at ±POINTS_DELTA_LIMIT.
export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { delta } = (await request.json()) as { delta?: number };

    if (delta === undefined || typeof delta !== 'number' || !Number.isFinite(delta)) {
      return NextResponse.json({ message: 'delta must be a finite number' }, { status: 400 });
    }
    if (Math.abs(delta) > POINTS_DELTA_LIMIT) {
      return NextResponse.json(
        { message: `delta must be between -${POINTS_DELTA_LIMIT} and ${POINTS_DELTA_LIMIT}` },
        { status: 400 },
      );
    }

    const user = await User.findById(id).select('rewardPoints isDemo isAdmin');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const blocked = refuseDemoTarget(user);
    if (blocked) return blocked;

    const newPoints = Math.max(0, (user.rewardPoints ?? 0) + delta);
    await User.findByIdAndUpdate(id, { rewardPoints: newPoints }, { runValidators: true });

    return NextResponse.json({ id, rewardPoints: newPoints });
  } catch (error) {
    console.error('[users/:id/points PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
