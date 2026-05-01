import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';

export const dynamic = 'force-dynamic';

// GET /api/bookmarks
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    const user = await User.findOne({ _id: userId });

    const bookmarks = await Product.find({ _id: { $in: user.bookmarks } });

    return new Response(JSON.stringify(bookmarks), { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/bookmarks
export const POST = async (request) => {
  try {
    const { productId } = await request.json();

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    // Find user in database
    const user = await User.findOne({ _id: userId });

    // Check if product is bookmarked
    let isBookmarked = user.bookmarks.includes(productId);

    let message;

    if (isBookmarked) {
      user.bookmarks.pull(productId);
      message = 'Bookmark Removed';
      isBookmarked = false;
    } else {
      user.bookmarks.push(productId);
      message = 'Bookmark Added';
      isBookmarked = true;
    }

    await user.save();

    return new Response(
      JSON.stringify({ message, isBookmarked }, { status: 200 })
    );
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};
