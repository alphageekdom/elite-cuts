import { type NextRequest, NextResponse } from 'next/server';
import mongoose, { type Types } from 'mongoose';

import connectDB from '@/config/database';
import Review from '@/models/Review';
import Product from '@/models/Product';
import { getSessionUser } from '@/lib/getSessionUser';

type RouteContext = { params: Promise<{ id: string }> };

async function recalcRating(productId: Types.ObjectId): Promise<void> {
  const result = (await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ])) as { avg: number }[];

  const newRating =
    result.length > 0 ? Math.round((result[0]?.avg ?? 0) * 100) / 100 : 0;

  await Product.findByIdAndUpdate(productId, { rating: newRating });
}

// PATCH /api/reviews/:id — update own review rating + comment
export const PATCH = async (req: NextRequest, { params }: RouteContext) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    await connectDB();

    const review = await Review.findById(id);
    if (!review)
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    if (String(review.user) !== sessionUser.userId)
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

    await recalcRating(review.product as Types.ObjectId);

    return NextResponse.json({ message: 'Review updated' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to update review' }, { status: 500 });
  }
};

// DELETE /api/reviews/:id — delete own review
export const DELETE = async (_req: NextRequest, { params }: RouteContext) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    await connectDB();

    const review = await Review.findById(id);
    if (!review)
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    if (String(review.user) !== sessionUser.userId)
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const productId = review.product as Types.ObjectId;
    await review.deleteOne();
    await recalcRating(productId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to delete review' }, { status: 500 });
  }
};
