import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { requireAdmin } from '@/utils/requireAdmin';

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/products/:id/stock — admin-only stock count adjustment
export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();
    const { id } = await params;
    const { stockCount } = (await request.json()) as { stockCount?: number };

    if (stockCount === undefined || !Number.isInteger(stockCount) || stockCount < 0) {
      return NextResponse.json(
        { message: 'stockCount must be a non-negative integer' },
        { status: 400 },
      );
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { stockCount },
      { returnDocument: 'after', runValidators: true },
    );

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ id: String(product._id), stockCount: product.stockCount });
  } catch (error) {
    console.error('[products/:id/stock PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
