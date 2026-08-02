import { describe, expect, it } from 'vitest';

import {
  buildInitialState,
  buildPrefillKey,
  checkoutReducer,
  EMPTY_PREFILL_KEY,
  type CheckoutState,
  type SavedAddress,
} from './CheckoutContext';

const home: SavedAddress = {
  id: 'home',
  label: 'Home',
  address1: '1412 Ivy Street',
  address2: 'Apt 3',
  city: 'San Diego',
  state: 'CA',
  zip: '92104',
  isDefault: true,
};

const work: SavedAddress = {
  id: 'work',
  label: 'Work',
  address1: '830 Kettner Boulevard',
  address2: '',
  city: 'San Diego',
  state: 'CA',
  zip: '92101',
  isDefault: false,
};

const contact = { name: 'Ada Byron', email: 'ada@example.com', phone: '6195550142' };

describe('buildInitialState', () => {
  it('defaults payment to the demo card path when the tile is enabled', () => {
    expect(buildInitialState(undefined, undefined, true).paymentMethod).toBe('card');
  });

  it('falls back to stripe when the demo tile is off, matching what the selector shows', () => {
    expect(buildInitialState(undefined, undefined, false).paymentMethod).toBe('stripe');
  });

  it('seeds the delivery address from the default saved address, not merely the first', () => {
    const state = buildInitialState(undefined, [work, home]);
    expect(state.deliveryAddress.address1).toBe(home.address1);
  });

  it('falls back to the first address when none is marked default', () => {
    const state = buildInitialState(undefined, [work, { ...home, isDefault: false }]);
    expect(state.deliveryAddress.address1).toBe(work.address1);
  });

  it('starts with an empty address and no addresses when the shopper is a guest', () => {
    const state = buildInitialState();
    expect(state.deliveryAddress.address1).toBe('');
    expect(state.savedAddresses).toEqual([]);
  });
});

describe('checkoutReducer — PREFILL_FROM_PROPS', () => {
  const guestState = (): CheckoutState => buildInitialState();

  // The one the render-phase dispatch actually rests on. CheckoutContext
  // dispatches this during render and its comment says that is "only safe
  // because PREFILL_FROM_PROPS is idempotent" — which nothing pinned until now.
  it('is idempotent: applying twice equals applying once', () => {
    const payload = { initialContact: contact, savedAddresses: [home, work] };
    const once = checkoutReducer(guestState(), { type: 'PREFILL_FROM_PROPS', payload });
    const twice = checkoutReducer(once, { type: 'PREFILL_FROM_PROPS', payload });
    expect(twice).toEqual(once);
  });

  it('fills only empty contact fields and never overwrites what was typed', () => {
    const typed: CheckoutState = {
      ...guestState(),
      contactPhone: '6195559999',
    };
    const next = checkoutReducer(typed, {
      type: 'PREFILL_FROM_PROPS',
      payload: { initialContact: contact },
    });

    expect(next.contactPhone).toBe('6195559999');
    expect(next.contactName).toBe(contact.name);
    expect(next.contactEmail).toBe(contact.email);
  });

  it('always replaces the saved-address list, so a fresh sign-in shows the right cards', () => {
    const stale: CheckoutState = { ...guestState(), savedAddresses: [work] };
    const next = checkoutReducer(stale, {
      type: 'PREFILL_FROM_PROPS',
      payload: { savedAddresses: [home] },
    });
    expect(next.savedAddresses).toEqual([home]);
  });

  it('seeds the delivery address only when every field is still empty', () => {
    const partiallyTyped: CheckoutState = {
      ...guestState(),
      deliveryAddress: { address1: '', address2: '', city: 'Encinitas', state: '', zip: '' },
    };
    const next = checkoutReducer(partiallyTyped, {
      type: 'PREFILL_FROM_PROPS',
      payload: { savedAddresses: [home] },
    });

    // One typed field is enough to make the address the shopper's, not ours.
    expect(next.deliveryAddress.city).toBe('Encinitas');
    expect(next.deliveryAddress.address1).toBe('');
  });

  it('seeds the delivery address when the form is untouched', () => {
    const next = checkoutReducer(guestState(), {
      type: 'PREFILL_FROM_PROPS',
      payload: { savedAddresses: [home] },
    });
    expect(next.deliveryAddress.address1).toBe(home.address1);
  });
});

describe('checkoutReducer — fulfillment and delivery', () => {
  // Keeping it is the point: clearing it meant a glance at the delivery option
  // silently moved the booking to the day's first window on the way back.
  it('keeps the pickup slot when switching to delivery', () => {
    const withSlot: CheckoutState = {
      ...buildInitialState(),
      pickupSlot: '2026-08-01T14:00',
    };
    const next = checkoutReducer(withSlot, { type: 'SET_FULFILLMENT', payload: 'delivery' });
    expect(next.pickupSlot).toBe('2026-08-01T14:00');
    expect(next.fulfillment).toBe('delivery');
  });

  it('keeps the pickup slot when switching back to pickup', () => {
    const state: CheckoutState = { ...buildInitialState(), pickupSlot: '2026-08-01T14:00' };
    const next = checkoutReducer(state, { type: 'SET_FULFILLMENT', payload: 'pickup' });
    expect(next.pickupSlot).toBe('2026-08-01T14:00');
  });

  // Editing an address has to invalidate the radius answer computed for the
  // previous one, or the submit gate would accept a stale "valid".
  it('resets the delivery check whenever the address changes', () => {
    const checked: CheckoutState = { ...buildInitialState(), deliveryCheck: 'valid' };
    const next = checkoutReducer(checked, {
      type: 'SET_DELIVERY_ADDRESS',
      payload: { address1: '9 Elsewhere Ave', address2: '', city: 'Reno', state: 'NV', zip: '89501' },
    });
    expect(next.deliveryCheck).toBe('idle');
  });

  it('records an explicit delivery-check result', () => {
    const next = checkoutReducer(buildInitialState(), {
      type: 'SET_DELIVERY_CHECK',
      payload: 'invalid',
    });
    expect(next.deliveryCheck).toBe('invalid');
  });
});

describe('checkoutReducer — payment', () => {
  it('cascades auto-settle off when save-card is turned off', () => {
    const state: CheckoutState = {
      ...buildInitialState(),
      saveCard: true,
      autoSettleAtPickup: true,
    };
    const next = checkoutReducer(state, { type: 'SET_SAVE_CARD', payload: false });
    expect(next.saveCard).toBe(false);
    expect(next.autoSettleAtPickup).toBe(false);
  });

  it('forces the card path and marks payment ready when a saved card is picked', () => {
    const next = checkoutReducer(buildInitialState(undefined, undefined, false), {
      type: 'SET_SELECTED_SAVED_CARD',
      payload: 'card_123',
    });
    expect(next.paymentMethod).toBe('card');
    expect(next.isPaymentReady).toBe(true);
  });

  it('does not reset payment-ready when the saved card is cleared', () => {
    // Deliberate: PaymentMethodSelector recomputes readiness on every change,
    // and resetting here would fight it.
    const selected = checkoutReducer(buildInitialState(), {
      type: 'SET_SELECTED_SAVED_CARD',
      payload: 'card_123',
    });
    const cleared = checkoutReducer(selected, {
      type: 'SET_SELECTED_SAVED_CARD',
      payload: null,
    });
    expect(cleared.selectedSavedCardId).toBeNull();
    expect(cleared.isPaymentReady).toBe(true);
  });
});

describe('checkoutReducer — promo', () => {
  it('carries the stacking flags off the applied promo', () => {
    const next = checkoutReducer(buildInitialState(), {
      type: 'SET_PROMO',
      payload: { code: 'GRILL25', amount: 12.5, promoId: 'p1', excludesPoints: true },
    });
    expect(next.promoExcludesPoints).toBe(true);
    expect(next.promoExcludesMember).toBe(false);
    expect(next.promoDiscount).toBe(12.5);
  });

  it('clears the flags along with the code when a promo is removed', () => {
    const applied = checkoutReducer(buildInitialState(), {
      type: 'SET_PROMO',
      payload: { code: 'GRILL25', amount: 12.5, promoId: 'p1', excludesPoints: true, excludesMember: true },
    });
    const removed = checkoutReducer(applied, {
      type: 'SET_PROMO',
      payload: { code: '', amount: 0 },
    });

    expect(removed.promoCode).toBe('');
    expect(removed.promoDiscount).toBe(0);
    expect(removed.promoId).toBe('');
    expect(removed.promoExcludesPoints).toBe(false);
    expect(removed.promoExcludesMember).toBe(false);
  });
});

describe('checkoutReducer — CLEAR_PREFILL', () => {
  // The prefilled state a signed-in customer's checkout starts from.
  const signedInState = (): CheckoutState =>
    buildInitialState(contact, [home, work]);

  // Same invariant PREFILL_FROM_PROPS carries, for the same reason: the sync in
  // CheckoutContext dispatches during render, and React may replay it.
  it('is idempotent: applying twice equals applying once', () => {
    const once = checkoutReducer(signedInState(), { type: 'CLEAR_PREFILL' });
    const twice = checkoutReducer(once, { type: 'CLEAR_PREFILL' });
    expect(twice).toEqual(once);
  });

  it('leaves nothing of the previous identity behind', () => {
    const next = checkoutReducer(signedInState(), { type: 'CLEAR_PREFILL' });
    expect(next.contactName).toBe('');
    expect(next.contactEmail).toBe('');
    expect(next.contactPhone).toBe('');
    expect(next.savedAddresses).toEqual([]);
    expect(next.deliveryAddress).toEqual(buildInitialState().deliveryAddress);
  });

  it('drops the card the previous shopper typed, and the intent to save it', () => {
    // `cardDetails` is typed into the card form, not read back from a saved
    // card, and the place-order call persists it as a SavedCard when `saveCard`
    // is set — so leaving either behind could save one person's card onto the
    // next person's account.
    const state: CheckoutState = {
      ...signedInState(),
      cardDetails: {
        cardholderName: 'A Customer',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
      },
      saveCard: true,
      selectedSavedCardId: 'card_prev_account',
    };
    const next = checkoutReducer(state, { type: 'CLEAR_PREFILL' });
    expect(next.cardDetails).toBeNull();
    expect(next.saveCard).toBe(false);
    expect(next.selectedSavedCardId).toBeNull();
  });

  it('keeps the rest of the order intact', () => {
    // Only identity-derived fields are cleared — a promo, redeemed points and
    // the chosen fulfilment belong to the order in progress, not to whoever
    // was signed in.
    const state: CheckoutState = {
      ...signedInState(),
      promoCode: 'SUMMER',
      promoDiscount: 500,
      pointsToRedeem: 200,
      fulfillment: 'delivery',
      orderNotes: 'Ring the bell',
    };
    const next = checkoutReducer(state, { type: 'CLEAR_PREFILL' });
    expect(next.promoCode).toBe('SUMMER');
    expect(next.promoDiscount).toBe(500);
    expect(next.pointsToRedeem).toBe(200);
    expect(next.fulfillment).toBe('delivery');
    expect(next.orderNotes).toBe('Ring the bell');
  });
});

describe('buildPrefillKey', () => {
  // The branch between filling and clearing is `prefillKey === EMPTY_PREFILL_KEY`.
  // If these two ever disagree about what "empty" means, a signed-in shopper's
  // typed details get wiped.
  it('produces EMPTY_PREFILL_KEY for props carrying nothing', () => {
    expect(buildPrefillKey()).toBe(EMPTY_PREFILL_KEY);
    expect(buildPrefillKey(undefined, [])).toBe(EMPTY_PREFILL_KEY);
    expect(buildPrefillKey({ name: '', email: '', phone: '' }, [])).toBe(
      EMPTY_PREFILL_KEY,
    );
  });

  it('differs as soon as any detail is present', () => {
    expect(buildPrefillKey(contact)).not.toBe(EMPTY_PREFILL_KEY);
    expect(buildPrefillKey(undefined, [home])).not.toBe(EMPTY_PREFILL_KEY);
  });

  it('is stable across new object identities for the same data', () => {
    expect(buildPrefillKey({ ...contact }, [{ ...home }])).toBe(
      buildPrefillKey(contact, [home]),
    );
  });
});
