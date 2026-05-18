import { NextResponse } from 'next/server';

import { getSessionUser } from '@/utils/getSessionUser';
import { listSavedCards } from '@/lib/payments/savedCards';

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
