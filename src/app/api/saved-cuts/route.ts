import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import User from '@/models/User';
import Product from '@/models/Product';
import { withAuth } from '@/lib/api-handler';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';

export const dynamic = 'force-dynamic';

// GET /api/saved-cuts
export const GET = withAuth(async (_req, _ctx, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const items = await Product.find({ _id: { $in: user.savedCuts } }).select(
      PUBLIC_PRODUCT_PROJECTION,
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[saved-cuts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// POST /api/saved-cuts — toggles a product in/out of savedCuts
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const { productId } = (await request.json()) as { productId?: string };

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ message: 'Invalid productId' }, { status: 400 });
    }

    // Confirm the product exists before mutating the user's savedCuts array.
    // Mongo silently no-ops an $addToSet of a non-existent _id, which means a
    // sloppy caller could quietly accumulate dead references in the array.
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const user = await User.findById(userId, 'savedCuts');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isBookmarked = user.savedCuts.some((id) => String(id) === productId);

    if (isBookmarked) {
      await User.findByIdAndUpdate(userId, { $pull: { savedCuts: productId } });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { savedCuts: productId } });
    }

    return NextResponse.json({
      message: isBookmarked ? 'Removed from saved cuts' : 'Saved to your cuts',
      isBookmarked: !isBookmarked,
    });
  } catch (error) {
    console.error('[saved-cuts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
