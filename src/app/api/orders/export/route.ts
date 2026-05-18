import { NextResponse } from 'next/server';
import type { Types } from 'mongoose';

import OrderModel from '@/models/Order';
import { ORDER_STATUSES } from '@/lib/order-constants';
import { withAdmin } from '@/lib/api-handler';
import { toCsv, csvFilename } from '@/lib/csv';
import { refundSummary } from '@/lib/order-refunds';
import type { RangeKey } from '@/components/admin/analytics/RangeToggle';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_RANGES = ['7D', '30D', '90D', '1Y'] as const satisfies readonly RangeKey[];
const RANGE_DAYS: Record<RangeKey, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 360 };

const parseRange = (raw: string | null): RangeKey | null => {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return (ALLOWED_RANGES as readonly string[]).includes(upper)
    ? (upper as RangeKey)
    : null;
};

const ALLOWED_PAYMENTS = ['Completed', 'Pending', 'Refunded', 'Partially Refunded'] as const;
type PaymentValue = (typeof ALLOWED_PAYMENTS)[number];

const ALLOWED_FULFILLMENTS = ['pickup', 'delivery'] as const;
type FulfillmentValue = (typeof ALLOWED_FULFILLMENTS)[number];

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
  paymentMethod?: string;
  paidAt?: Date | null;
  readyAt?: Date | null;
  pickedUpAt?: Date | null;
  cancelledAt?: Date | null;
  fulfillmentType?: 'pickup' | 'delivery';
  pickupSlot?: string;
  paymentResult?: { status?: string };
  createdAt: Date;
};

export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status')?.trim() ?? '';
    const search = url.searchParams.get('search')?.trim() ?? '';
    const range = parseRange(url.searchParams.get('range'));
    const paymentParam = url.searchParams.get('payment')?.trim() ?? '';
    const fulfillmentParam = url.searchParams.get('fulfillment')?.trim() ?? '';

    const query: Record<string, unknown> = {};

    if (range) {
      query.createdAt = { $gte: new Date(Date.now() - RANGE_DAYS[range] * DAY_MS) };
    }
    if (statusParam && statusParam !== 'all') {
      const match = (ORDER_STATUSES as readonly string[]).find((s) => s === statusParam);
      if (match) query.orderStatus = match;
    }
    if (fulfillmentParam && (ALLOWED_FULFILLMENTS as readonly string[]).includes(fulfillmentParam)) {
      query.fulfillmentType = fulfillmentParam as FulfillmentValue;
    }

    let orders = (await OrderModel.find(query)
      .sort({ createdAt: -1 })
      .limit(10000)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean()
      .exec()) as unknown as OrderLean[];

    if (paymentParam && (ALLOWED_PAYMENTS as readonly string[]).includes(paymentParam)) {
      const want = paymentParam as PaymentValue;
      orders = orders.filter((o) => (o.paymentResult?.status ?? 'Pending') === want);
    }

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
      { header: 'paymentMethod', value: (o) => o.paymentMethod ?? '' },
      {
        header: 'refundedAmount',
        value: (o) => {
          const summary = refundSummary(
            o.orderItems.map((it) => ({ qty: it.qty, price: it.price, refunded: it.refunded ?? false })),
            { subtotal: o.subtotal, tax: o.tax, totalCost: o.totalCost },
          );
          return summary.refundedAmount.toFixed(2);
        },
      },
      { header: 'createdAt', value: (o) => o.createdAt.toISOString() },
      { header: 'paidAt', value: (o) => (o.paidAt ? o.paidAt.toISOString() : '') },
      { header: 'readyAt', value: (o) => (o.readyAt ? o.readyAt.toISOString() : '') },
      { header: 'pickedUpAt', value: (o) => (o.pickedUpAt ? o.pickedUpAt.toISOString() : '') },
      { header: 'cancelledAt', value: (o) => (o.cancelledAt ? o.cancelledAt.toISOString() : '') },
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
