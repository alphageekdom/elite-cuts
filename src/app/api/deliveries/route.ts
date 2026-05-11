import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Delivery from '@/models/Delivery';
import Product from '@/models/Product';
import { withAdmin } from '@/lib/api-handler';

export const GET = withAdmin(async () => {
  try {
    const upcoming = await Delivery.find({
      deliveryDate: { $gte: new Date() },
    }).sort({ deliveryDate: 1 }).limit(10).lean();
    return NextResponse.json(upcoming);
  } catch (error) {
    console.error('[deliveries GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const { deliveryDate, supplier, supplierSuffix, detail, status, productId } = await request.json();
    if (productId) {
      if (!mongoose.isValidObjectId(productId)) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
      const exists = await Product.exists({ _id: productId });
      if (!exists) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
    }
    const delivery = await Delivery.create({
      deliveryDate, supplier, supplierSuffix, detail, status,
      ...(productId ? { productId } : {}),
    });
    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error('[deliveries POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
