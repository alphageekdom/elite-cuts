import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import ShopHoursModel from '@/models/ShopHours';
import { requireAdmin } from '@/utils/requireAdmin';

export const GET = async () => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const doc = await ShopHoursModel.findOneAndUpdate(
      {},
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return NextResponse.json(doc);
  } catch (error) {
    console.error('[shop-hours GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

export const PUT = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const { days } = await request.json();
    const doc = await ShopHoursModel.findOneAndUpdate(
      {},
      { $set: { days } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return NextResponse.json(doc);
  } catch (error) {
    console.error('[shop-hours PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
