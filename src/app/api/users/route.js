import connectDB from '@/config/database';
import User from '@/models/User';

await connectDB();

// GET /api/users
export const GET = async (request) => {
  try {
    const page = request.nextUrl.searchParams.get('page') || 1;
    const pageSize = request.nextUrl.searchParams.get('pageSize') || 6;

    const sortField = request.nextUrl.searchParams.get('sortField') || '_id';
    const sortOrder = request.nextUrl.searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * pageSize;

    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const [total, users] = await Promise.all([
      User.countDocuments({}),
      User.find({}).sort(sort).skip(skip).limit(pageSize).select('-largeField'),
    ]);

    const result = {
      total,
      users,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

export const DELETE = async (request) => {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return new Response('User not found', { status: 404 });
    }

    return new Response('User deleted successfully', { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/users
export const POST = async (request) => {
  try {
    const body = await request.json();

    const newUser = await User.create(body);

    return new Response(JSON.stringify(newUser), {
      status: 201,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};
