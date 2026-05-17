import { NextResponse } from 'next/server';

import connectDB from '@/config/database';
import Promo from '@/models/Promo';

// GET /api/promos/public — unauthenticated. Returns the codes the admin has
// opted into public surfacing AND that are currently usable (active, in
// window, not exhausted). The customer-side chip strip on checkout fetches
// from here; nothing else does. Per-customer eligibility (firstOrderOnly,
// perCustomerLimit) is intentionally NOT filtered here — the chip click
// goes through the existing apply flow which surfaces the precise reason
// if the customer doesn't qualify.
export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    const promos = await Promo.find({
      isPublic: true,
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
        {
          $or: [
            { usageLimit: { $exists: false } },
            { usageLimit: null },
            { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
          ],
        },
      ],
    })
      .select('code type value')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const items = promos.map((p) => ({
      code: p.code,
      label:
        p.type === 'percent'
          ? `${p.value}% off`
          : `$${(p.value / 100).toFixed(p.value % 100 === 0 ? 0 : 2)} off`,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[promos/public GET]', error);
    return NextResponse.json({ items: [] });
  }
}
