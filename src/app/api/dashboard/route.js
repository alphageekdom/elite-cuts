import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

export const GET = async () => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  await connectDB();

  try {
    const [usersCount, productsCount] = await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
    ]);

    return new Response(
      JSON.stringify({ users: usersCount, products: productsCount }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
