import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import { withAdmin } from '@/lib/api-handler';

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/users/:id/points — admin-only reward points adjustment.
// Body: { delta: number } — positive to add, negative to subtract.
// Points floor at 0.
export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { delta } = (await request.json()) as { delta?: number };

    if (delta === undefined || typeof delta !== 'number' || !Number.isFinite(delta)) {
      return NextResponse.json({ message: 'delta must be a finite number' }, { status: 400 });
    }

    const user = await User.findById(id).select('rewardPoints');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const newPoints = Math.max(0, (user.rewardPoints ?? 0) + delta);
    await User.findByIdAndUpdate(id, { rewardPoints: newPoints }, { runValidators: true });

    return NextResponse.json({ id, rewardPoints: newPoints });
  } catch (error) {
    console.error('[users/:id/points PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
