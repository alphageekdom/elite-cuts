import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import Delivery from '@/models/Delivery';
import { requireAdmin } from '@/utils/requireAdmin';
import { isIn } from '@/lib/validation';
import { DELIVERY_STATUSES } from '@/models/Delivery';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const { id } = await params;
    const { status } = (await request.json()) as { status?: string };
    if (!status || !isIn(DELIVERY_STATUSES, status)) {
      return NextResponse.json({ message: `status must be one of: ${DELIVERY_STATUSES.join(', ')}` }, { status: 400 });
    }
    const delivery = await Delivery.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
    if (!delivery) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(delivery);
  } catch (error) {
    console.error('[deliveries/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
