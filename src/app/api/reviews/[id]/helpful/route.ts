import { NextResponse } from 'next/server';

import Review from '@/models/Review';
import { withAuth, parseObjectId } from '@/lib/api-handler';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

// A signed-in user gets a burst of toggles before the throttle bites — enough
// to fix a fat-finger, not enough to script vote-stuffing across the catalog.
// Mirrors the review-create limiter's shape (per-user AND per-IP window).
const HELPFUL_USER_MAX_PER_HOUR = 60;
const HELPFUL_IP_MAX_PER_HOUR = 120;

// POST /api/reviews/:id/helpful — toggle the caller's "helpful" vote on a
// review. One vote per user, enforced by the voter-set on the document.
// Returns the fresh count and the caller's new vote state so the optimistic
// client can reconcile.
export const POST = withAuth<{ id: string }>(async (req, ctx, userId) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const ip = clientIpFromHeaders(req.headers);
    const userLimit = rateLimit({
      key: `helpful:user:${userId}`,
      max: HELPFUL_USER_MAX_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    const ipLimit = rateLimit({
      key: `helpful:ip:${ip}`,
      max: HELPFUL_IP_MAX_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    if (!userLimit.ok || !ipLimit.ok) {
      const retryAfterSec = Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec);
      return NextResponse.json(
        { message: 'Too many votes, please try again later' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const review = await Review.findById(id).select('user helpfulVoters');
    if (!review) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    // No self-votes — a review author can't inflate their own helpful count.
    if (review.user && String(review.user) === userId) {
      return NextResponse.json(
        { message: 'You cannot mark your own review helpful' },
        { status: 403 },
      );
    }

    const voters = review.helpfulVoters ?? [];
    const hasVoted = voters.some((v) => String(v) === userId);

    // Atomic add/remove so two rapid toggles can't race to a wrong count.
    const update = hasVoted
      ? { $pull: { helpfulVoters: userId } }
      : { $addToSet: { helpfulVoters: userId } };
    const updated = await Review.findByIdAndUpdate(id, update, {
      new: true,
    }).select('helpfulVoters');

    const helpfulCount = updated?.helpfulVoters?.length ?? 0;
    return NextResponse.json({ data: { helpfulCount, voted: !hasVoted } });
  } catch (error) {
    console.error('[reviews/:id/helpful POST]', error);
    return NextResponse.json({ message: 'Failed to record vote' }, { status: 500 });
  }
});
