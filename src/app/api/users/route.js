import connectDB from '@/config/database';
import User from '@/models/User';
import { requireAdmin } from '@/utils/requireAdmin';

const ALLOWED_USER_SORT_FIELDS = new Set(['_id', 'name', 'email', 'createdAt', 'role']);

export const GET = async (request) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const page = request.nextUrl.searchParams.get('page') || 1;
    const pageSize = request.nextUrl.searchParams.get('pageSize') || 6;
    const rawSortField = request.nextUrl.searchParams.get('sortField') || '_id';
    const sortField = ALLOWED_USER_SORT_FIELDS.has(rawSortField) ? rawSortField : '_id';
    const sortOrder = request.nextUrl.searchParams.get('sortOrder') || 'asc';
    const skip = (page - 1) * pageSize;
    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const [total, users] = await Promise.all([
      User.countDocuments({}),
      User.find({}).sort(sort).skip(skip).limit(pageSize).select('-largeField'),
    ]);

    return new Response(JSON.stringify({ total, users }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};

export const DELETE = async (request) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const userId = request.nextUrl.searchParams.get('userId');
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return new Response('User not found', { status: 404 });
    }

    return new Response('User deleted successfully', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
