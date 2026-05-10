import { NextResponse } from 'next/server';
import ShopHoursModel from '@/models/ShopHours';
import { withAdmin } from '@/lib/api-handler';

export const GET = withAdmin(async () => {
  try {
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
});

export const PUT = withAdmin(async (request) => {
  try {
    const { days } = await request.json();
    if (!Array.isArray(days)) {
      return NextResponse.json({ message: 'days must be an array' }, { status: 400 });
    }
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
});
