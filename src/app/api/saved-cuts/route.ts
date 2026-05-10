import { NextResponse, type NextRequest } from 'next/server';

import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';
import { unauthorized } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// GET /api/saved-cuts
export const GET = async () => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return unauthorized();
    }

    await connectDB();

    const user = await User.findById(sessionUser.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const savedCuts = await Product.find({ _id: { $in: user.savedCuts } });

    return NextResponse.json(savedCuts);
  } catch (error) {
    console.error('[saved-cuts GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/saved-cuts — toggles a product in/out of savedCuts
export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return unauthorized();
    }

    await connectDB();

    const { productId } = (await request.json()) as { productId?: string };

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    const user = await User.findById(sessionUser.userId, 'savedCuts');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isBookmarked = user.savedCuts.some((id) => String(id) === productId);

    if (isBookmarked) {
      await User.findByIdAndUpdate(sessionUser.userId, { $pull: { savedCuts: productId } });
    } else {
      await User.findByIdAndUpdate(sessionUser.userId, { $addToSet: { savedCuts: productId } });
    }

    return NextResponse.json({
      message: isBookmarked ? 'Removed from saved cuts' : 'Saved to your cuts',
      isBookmarked: !isBookmarked,
    });
  } catch (error) {
    console.error('[saved-cuts POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
