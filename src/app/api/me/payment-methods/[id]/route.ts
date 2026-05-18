import { NextResponse } from 'next/server';

import { getSessionUser } from '@/utils/getSessionUser';
import { deleteSavedCard } from '@/lib/payments/savedCards';

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
