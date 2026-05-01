import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

export const dynamic = 'force-dynamic';
await connectDB();

// POST /api/bookmarks/check
export const POST = async (request) => {
  try {
    const { productId } = await request.json();

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    const user = await User.findOne({ _id: userId }, 'bookmarks');
    if (!user) {
      return new Response('User Not Found', { status: 404 });
    }

    const isBookmarked = user.bookmarks.includes(productId);

    return new Response(JSON.stringify({ isBookmarked }, { status: 200 }));
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};
