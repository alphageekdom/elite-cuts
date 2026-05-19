import { NextResponse, type NextRequest } from 'next/server';

import { getSessionUser } from '@/lib/getSessionUser';
import {
  listSavedCards,
  recordTypedCardSave,
  validateTypedCardDetails,
} from '@/lib/payments/savedCards';

export const dynamic = 'force-dynamic';

// GET /api/me/payment-methods — list the signed-in customer's saved cards.
// Real Stripe mode reads from Stripe; stub mode reads from the local SavedCard
// collection. Same shape either way so the profile tab doesn't branch.
export const GET = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cards = await listSavedCards(sessionUser.userId);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[me/payment-methods GET]', error);
    return NextResponse.json(
      { message: 'Could not load saved cards' },
      { status: 500 },
    );
  }
};

// POST /api/me/payment-methods — register a new card directly from the
// profile tab, outside any checkout. Mirrors the Card-tile save path but
// without an order — useful when a customer gets a replacement card and
// wants to add it before placing an order.
//
// Real Stripe mode for production would require Stripe Elements / a
// SetupIntent flow on its own page (PCI scope). This portfolio writes to the
// local SavedCard collection regardless of mode, same as the Card-tile demo
// save — the row only surfaces in stub mode (real mode reads from Stripe).
export const POST = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const details = validateTypedCardDetails(body);
  if (!details) {
    return NextResponse.json(
      { message: 'Card details are missing or invalid' },
      { status: 400 },
    );
  }

  try {
    const result = await recordTypedCardSave(sessionUser.userId, details);
    if (result === 'duplicate') {
      return NextResponse.json(
        {
          message: `You already have a saved ${details.brand} ending ${details.last4} with that expiry. Use Edit on the existing row to update it.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/payment-methods POST]', error);
    return NextResponse.json(
      { message: 'Could not add card' },
      { status: 500 },
    );
  }
};
