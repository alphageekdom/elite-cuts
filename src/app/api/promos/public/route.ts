import { NextResponse } from 'next/server';

import connectDB from '@/config/database';
import Promo from '@/models/Promo';
import { formatPromoLabel } from '@/lib/promos/format';

// Cache the response across all callers for 60 seconds. Admins change
// promos a few times a week; customers hit /checkout constantly. The 60s
// window means an admin's edit takes up to a minute to appear in the
// chip strip, which is acceptable trade vs the per-visit DB read.
export const revalidate = 60;

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
      label: formatPromoLabel(p),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[promos/public GET]', error);
    return NextResponse.json({ items: [] });
  }
}
