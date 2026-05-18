import { NextResponse, type NextRequest } from 'next/server';

import { getSessionUser } from '@/utils/getSessionUser';
import {
  deleteSavedCard,
  updateSavedCardExpiry,
} from '@/lib/payments/savedCards';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/me/payment-methods/[id] — detach a saved card. Real Stripe mode
// hits `stripe.paymentMethods.detach`; stub mode removes the local SavedCard
// row. Ownership is re-validated inside the helper on both paths so a tampered
// id can't detach another customer's card.
export const DELETE = async (_request: Request, ctx: RouteContext) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ message: 'Card id is required' }, { status: 400 });
  }

  try {
    const removed = await deleteSavedCard(sessionUser.userId, id);
    if (!removed) {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/payment-methods DELETE]', error);
    return NextResponse.json(
      { message: 'Could not remove card' },
      { status: 500 },
    );
  }
};

// PATCH /api/me/payment-methods/[id] — update expiry on a saved card. The
// only field that can change without re-tokenizing; brand/last4 are baked
// into the card itself. Used when an expiring card needs its YY/MM bumped.
export const PATCH = async (request: NextRequest, ctx: RouteContext) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ message: 'Card id is required' }, { status: 400 });
  }

  let body: { expMonth?: unknown; expYear?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const expMonth = typeof body.expMonth === 'number' ? body.expMonth : NaN;
  const expYear = typeof body.expYear === 'number' ? body.expYear : NaN;

  try {
    const ok = await updateSavedCardExpiry(sessionUser.userId, id, expMonth, expYear);
    if (!ok) {
      return NextResponse.json(
        { message: 'Card not found or invalid expiry' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/payment-methods PATCH]', error);
    return NextResponse.json(
      { message: 'Could not update card' },
      { status: 500 },
    );
  }
};
