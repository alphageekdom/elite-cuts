import { NextResponse } from 'next/server';
import { type Types } from 'mongoose';

import Review from '@/models/Review';
import { withAuth, parseObjectId } from '@/lib/api-handler';
import { recomputeProductRating } from '@/lib/reviews/recompute';

// PATCH /api/reviews/:id — update own review rating + comment
export const PATCH = withAuth<{ id: string }>(async (req, ctx, userId) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const review = await Review.findById(id);
    if (!review)
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    if (String(review.user) !== userId)
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { rating, comment } = (await req.json()) as {
      rating?: number | string;
      comment?: string;
    };

    if (!rating || !comment)
      return NextResponse.json(
        { message: 'Rating and comment are required' },
        { status: 400 },
      );

    if (comment.length > 1000)
      return NextResponse.json(
        { message: 'Comment must be 1000 characters or fewer' },
        { status: 400 },
      );

    const parsedRating = Number.parseFloat(String(rating));
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)
      return NextResponse.json({ message: 'Invalid rating value' }, { status: 400 });

    review.rating = parsedRating;
    review.comment = comment.trim();
    await review.save();

    await recomputeProductRating(review.product as Types.ObjectId);

    return NextResponse.json({ message: 'Review updated' });
  } catch (error) {
    console.error('[reviews/:id PATCH]', error);
    return NextResponse.json({ message: 'Failed to update review' }, { status: 500 });
  }
});

// DELETE /api/reviews/:id — delete own review
export const DELETE = withAuth<{ id: string }>(async (_req, ctx, userId) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const review = await Review.findById(id);
    if (!review)
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    if (String(review.user) !== userId)
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const productId = review.product as Types.ObjectId;
    await review.deleteOne();
    await recomputeProductRating(productId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[reviews/:id DELETE]', error);
    return NextResponse.json({ message: 'Failed to delete review' }, { status: 500 });
  }
});
