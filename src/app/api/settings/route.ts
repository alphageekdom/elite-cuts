import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import ShopSettings from '@/models/ShopSettings';
import { requireAdmin } from '@/utils/requireAdmin';

// GET /api/settings — returns the singleton settings doc (creates defaults on first call)
export const GET = async () => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();
    const settings = await ShopSettings.findOneAndUpdate(
      {},
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[settings GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// PUT /api/settings — replaces writable fields on the singleton doc
export const PUT = async (request: NextRequest) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();
    const body = await request.json();

    // Strip internal Mongoose fields so they can't be overwritten
    const { _id, __v, createdAt, updatedAt, ...patch } = body;
    void _id; void __v; void createdAt; void updatedAt;

    const settings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: patch },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[settings PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
