import { NextResponse, type NextRequest } from 'next/server';

import { validatePromo } from '@/lib/promos/validate';
import { getSessionUser } from '@/utils/getSessionUser';

// POST: validates a code against the live Promo collection and returns the
// discount and stacking flags the checkout UI needs. Never increments
// usageCount — that happens atomically at order placement (Phase 1C). The
// caller passes subtotalCents from the client cart; the server re-derives
// it from the actual order items at placement time so a tampered subtotal
// here only buys the customer a misleading apply pill, never a real
// discount.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: unknown;
      subtotalCents?: unknown;
    };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const subtotalCents =
      typeof body.subtotalCents === 'number' ? body.subtotalCents : NaN;

    if (!code) {
      return NextResponse.json(
        { message: 'Code is required' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
      return NextResponse.json(
        { message: 'Invalid subtotal' },
        { status: 400 },
      );
    }

    const sessionUser = await getSessionUser();
    const result = await validatePromo({
      code,
      userId: sessionUser?.userId ?? null,
      subtotalCents,
      isMember: Boolean(sessionUser?.userId),
    });

    if (!result.valid) {
      return NextResponse.json({ valid: false, reason: result.reason });
    }

    return NextResponse.json({
      valid: true,
      code: result.promo.code,
      discountCents: result.discountCents,
      promoId: String(result.promo._id),
      excludesPoints: result.promo.excludesPoints,
      excludesMember: result.promo.excludesMember,
    });
  } catch (error) {
    console.error('[promos/apply POST]', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 },
    );
  }
}
