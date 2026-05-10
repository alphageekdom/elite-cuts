import { NextResponse, type NextRequest } from 'next/server';
import type { SortOrder } from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';
import { requireAdmin } from '@/utils/requireAdmin';
import { parsePagination } from '@/lib/api-handler';

const ALLOWED_USER_SORT_FIELDS = new Set(['_id', 'name', 'email', 'createdAt', 'role']);

export const GET = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const { skip, pageSize } = parsePagination(params, { pageSize: 6 });
    const rawSortField = params.get('sortField') ?? '_id';
    const sortField = ALLOWED_USER_SORT_FIELDS.has(rawSortField) ? rawSortField : '_id';
    const sortOrder: SortOrder = params.get('sortOrder') === 'desc' ? -1 : 1;
    const sort: Record<string, SortOrder> = { [sortField]: sortOrder };

    const [total, users] = await Promise.all([
      User.countDocuments({}),
      User.find({}).sort(sort).skip(skip).limit(pageSize).select('-password'),
    ]);

    return NextResponse.json({ total, users });
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
