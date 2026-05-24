import { NextResponse } from 'next/server';
import User from '@/models/User';
import { parseObjectId, withAdminNonDemo } from '@/lib/api-handler';
import { refuseDemoTarget } from '@/lib/auth/demo-responses';

// Sized to a clearly-not-real ceiling so a typo or tampered request can't
// silently inflate a balance to "comp an unlimited series of orders" levels.
// The redemption flow caps per-order separately; this is the outer rail on
// the admin-grant primitive itself.
const POINTS_DELTA_LIMIT = 1_000_000;

// PATCH /api/users/:id/points — admin-only reward points adjustment.
// Body: { delta: number } — positive to add, negative to subtract.
// Points floor at 0; delta is capped at ±POINTS_DELTA_LIMIT.
//
// Writes a matching `pointsHistory` entry alongside the balance write so the
// audit trail stays whole — without it, the next expiration sweep that
// recomputes balance from the ledger would silently clobber the manual grant.
// Lifetime points only move on positive deltas to mirror the order-completion
// helpers (lifetime is never decremented).
export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

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
    if (delta === 0) {
      return NextResponse.json({ message: 'delta must be non-zero' }, { status: 400 });
    }

    const user = await User.findById(id).select('rewardPoints isDemo isAdmin');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const blocked = refuseDemoTarget(user);
    if (blocked) return blocked;

    const newPoints = Math.max(0, (user.rewardPoints ?? 0) + delta);
    const appliedDelta = newPoints - (user.rewardPoints ?? 0);

    // Negative delta against a zero balance is a no-op; skip the write so the
    // ledger doesn't accumulate misleading `delta: 0` rows.
    if (appliedDelta === 0) {
      return NextResponse.json({ data: { id, rewardPoints: newPoints } });
    }

    const update: Record<string, unknown> = {
      $set: { rewardPoints: newPoints },
      $push: {
        pointsHistory: {
          delta: appliedDelta,
          reason: 'admin_adjustment',
          expiresAt: null,
          createdAt: new Date(),
        },
      },
    };
    if (appliedDelta > 0) {
      update.$inc = { lifetimePoints: appliedDelta };
    }

    await User.findByIdAndUpdate(id, update, { runValidators: true });

    return NextResponse.json({ data: { id, rewardPoints: newPoints } });
  } catch (error) {
    console.error('[users/:id/points PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
