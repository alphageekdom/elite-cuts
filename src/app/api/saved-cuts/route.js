import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';

export const dynamic = 'force-dynamic';

// GET /api/saved-cuts
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    const user = await User.findOne({ _id: userId });

    const savedCuts = await Product.find({ _id: { $in: user.savedCuts } });

    return new Response(JSON.stringify(savedCuts), { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/saved-cuts
export const POST = async (request) => {
  try {
    const { productId } = await request.json();

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    const user = await User.findOne({ _id: userId });

    let isBookmarked = user.savedCuts.includes(productId);

    let message;

    if (isBookmarked) {
      user.savedCuts.pull(productId);
      message = 'Removed from saved cuts';
      isBookmarked = false;
    } else {
      user.savedCuts.push(productId);
      message = 'Saved to your cuts';
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
