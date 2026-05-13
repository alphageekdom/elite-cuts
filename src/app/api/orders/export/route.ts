import { NextResponse } from 'next/server';
import type { Types } from 'mongoose';

import OrderModel from '@/models/Order';
import { ORDER_STATUSES } from '@/lib/order-constants';
import { withAdmin } from '@/lib/api-handler';
import { toCsv, csvFilename } from '@/lib/csv';
import { refundSummary } from '@/lib/order-refunds';

export const dynamic = 'force-dynamic';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

type OrderItemLean = {
  qty: number;
  price: number;
  refunded?: boolean;
};

type OrderLean = {
  _id: Types.ObjectId;
  user: PopulatedUser | null;
  orderItems: OrderItemLean[];
  subtotal: number;
  tax: number;
  totalCost: number;
  orderStatus: string;
  paidAt?: Date | null;
  fulfillmentType?: 'pickup' | 'delivery';
  pickupSlot?: string;
  createdAt: Date;
};

export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status')?.trim() ?? '';
    const search = url.searchParams.get('search')?.trim() ?? '';

    const query: Record<string, unknown> = {};
    if (statusParam && statusParam !== 'all') {
      const match = (ORDER_STATUSES as readonly string[]).find((s) => s === statusParam);
      if (match) query.orderStatus = match;
    }

    let orders = (await OrderModel.find(query)
      .sort({ createdAt: -1 })
      .limit(10000)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean()
      .exec()) as unknown as OrderLean[];

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter((o) => {
        const ref = `#EC-${o._id.toString().slice(-4).toUpperCase()}`.toLowerCase();
        const name = (o.user?.name ?? '').toLowerCase();
        const email = (o.user?.email ?? '').toLowerCase();
        return ref.includes(q) || name.includes(q) || email.includes(q);
      });
    }

    const csv = toCsv(orders, [
      { header: 'orderRef', value: (o) => `#EC-${o._id.toString().slice(-4).toUpperCase()}` },
      { header: 'status', value: (o) => o.orderStatus },
      { header: 'customerName', value: (o) => o.user?.name ?? '' },
      { header: 'customerEmail', value: (o) => o.user?.email ?? '' },
      { header: 'fulfillment', value: (o) => o.fulfillmentType ?? 'pickup' },
      { header: 'pickupSlot', value: (o) => o.pickupSlot ?? '' },
      { header: 'subtotal', value: (o) => o.subtotal.toFixed(2) },
      { header: 'tax', value: (o) => o.tax.toFixed(2) },
      { header: 'total', value: (o) => o.totalCost.toFixed(2) },
      {
        header: 'refundedAmount',
        value: (o) => {
          const summary = refundSummary(
            o.orderItems.map((it) => ({ qty: it.qty, price: it.price, refunded: it.refunded ?? false })),
            { subtotal: o.subtotal, tax: o.tax },
          );
          return summary.refundedAmount.toFixed(2);
        },
      },
      { header: 'createdAt', value: (o) => o.createdAt.toISOString() },
      { header: 'paidAt', value: (o) => (o.paidAt ? o.paidAt.toISOString() : '') },
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('orders')}"`,
      },
    });
  } catch (error) {
    console.error('[orders export GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
