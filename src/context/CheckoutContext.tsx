'use client';

import {
  createContext,
  useContext,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

export type Fulfillment = 'pickup' | 'delivery';

// 'card' is the demo card-form path (no Stripe round trip — order is created
// paid directly with paymentMethod 'Credit Card'); 'stripe' redirects through
// Stripe Checkout and the order stamps 'Stripe'.
export type PayMethod = 'card' | 'stripe';

export type DeliveryAddress = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

export type SavedAddress = DeliveryAddress & {
  id: string;
  label: string;
  isDefault: boolean;
};

const EMPTY_ADDRESS: DeliveryAddress = { address1: '', address2: '', city: '', state: '', zip: '' };

// Lifecycle of the delivery-radius lookup. 'error' means the geocoder itself
// couldn't be reached, which is deliberately not the same as 'invalid'.
export type DeliveryCheck = 'idle' | 'checking' | 'valid' | 'invalid' | 'error';

export type CheckoutState = {
  isPaymentReady: boolean;
  paymentMethod: PayMethod;
  fulfillment: Fulfillment;
  promoCode: string;
  promoDiscount: number;         // dollar value of the applied promo
  // Stored as the string form of the Promo ObjectId so the place-order POST
  // can reference it without re-fetching, and the gating logic below can
  // read it. Empty string when no promo is applied.
  promoId: string;
  // Stacking flags carried over from the applied promo. Drive UI gating on
  // the points input and computeTotals' member-discount suppression.
  promoExcludesPoints: boolean;
  promoExcludesMember: boolean;
  pointsToRedeem: number;
  pointsDiscount: number;        // dollar value of the redeemed points
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pickupSlot: string;
  deliveryAddress: DeliveryAddress;
  // Result of the delivery-radius lookup for the address currently held in
  // `deliveryAddress`. It used to live in DeliveryAddressForm's local state,
  // where it rendered "we can't deliver to this address" and gated nothing —
  // the customer could read that and pay anyway. Lifted here so the submit
  // gate can read it, and reset to 'idle' whenever the address changes so a
  // stale "valid" can't outlive the address it was computed for.
  deliveryCheck: DeliveryCheck;
  savedAddresses: SavedAddress[];
  orderNotes: string;
  // Whether the customer ticked "Save this card" under the Stripe tile or the
  // Card tile. Only meaningful for logged-in shoppers — the UI hides the
  // checkbox for guests.
  saveCard: boolean;
  // Display attributes derived from the Card tile's typed-in card form,
  // populated only when the form is fully valid. Used when saveCard is on and
  // paymentMethod is 'card' to write a SavedCard row after the demo order
  // completes. Raw card number is never lifted out of the form — only the
  // four display fields the profile tab needs.
  cardDetails: {
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  // When set, the shopper picked a card from the saved-cards strip at the
  // top of the Payment section. Locks paymentMethod to 'card' (saved-card
  // pay routes through the demo path on EliteCuts; real Stripe-attached
  // cards are surfaced on Stripe's hosted page via the customer link).
  selectedSavedCardId: string | null;
  // Phase 4 — opt-in to auto-charging the realized-vs-estimate difference
  // at pickup. UI gates the checkbox behind a saved-card path (either
  // saveCard or a selectedSavedCardId) AND the cart containing at least
  // one variable-weight cut. Off for guests and Card-tile demo orders.
  autoSettleAtPickup: boolean;
};

export type CheckoutAction =
  | { type: 'SET_FULFILLMENT'; payload: Fulfillment }
  | { type: 'SET_PAYMENT_METHOD'; payload: PayMethod }
  | { type: 'SET_PAYMENT_READY'; payload: boolean }
  | {
      type: 'SET_PROMO';
      payload: {
        code: string;
        amount: number;
        promoId?: string;
        excludesPoints?: boolean;
        excludesMember?: boolean;
      };
    }
  | { type: 'SET_REDEMPTION'; payload: { points: number; dollars: number } }
  | { type: 'SET_CONTACT'; payload: { name: string; email: string; phone: string } }
  | { type: 'SET_PICKUP_SLOT'; payload: string }
  | { type: 'SET_DELIVERY_ADDRESS'; payload: DeliveryAddress }
  | { type: 'SET_DELIVERY_CHECK'; payload: DeliveryCheck }
  | { type: 'SET_ORDER_NOTES'; payload: string }
  | { type: 'SET_SAVE_CARD'; payload: boolean }
  | { type: 'SET_AUTO_SETTLE_AT_PICKUP'; payload: boolean }
  | { type: 'SET_CARD_DETAILS'; payload: CheckoutState['cardDetails'] }
  | { type: 'SET_SELECTED_SAVED_CARD'; payload: string | null }
  | {
      type: 'PREFILL_FROM_PROPS';
      payload: {
        initialContact?: CheckoutInitialContact;
        savedAddresses?: SavedAddress[];
      };
    };

const EMPTY_INITIAL_STATE: CheckoutState = {
  isPaymentReady: false,
  // Placeholder — the actual default is set per-provider in buildInitialState
  // based on the `demoCardEnabled` prop the server component resolves.
  paymentMethod: 'stripe',
  fulfillment: 'pickup',
  promoCode: '',
  promoDiscount: 0,
  promoId: '',
  promoExcludesPoints: false,
  promoExcludesMember: false,
  pointsToRedeem: 0,
  pointsDiscount: 0,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  pickupSlot: '',
  deliveryAddress: EMPTY_ADDRESS,
  deliveryCheck: 'idle',
  savedAddresses: [],
  orderNotes: '',
  saveCard: false,
  autoSettleAtPickup: false,
  cardDetails: null,
  selectedSavedCardId: null,
};

export type CheckoutInitialContact = {
  name?: string;
  email?: string;
  phone?: string;
};

const toDeliveryAddress = (sa: SavedAddress): DeliveryAddress => ({
  address1: sa.address1,
  address2: sa.address2,
  city: sa.city,
  state: sa.state,
  zip: sa.zip,
});

// Exported for tests. The reducer carries a load-bearing invariant its
// render-phase dispatch depends on (see PREFILL_FROM_PROPS), which prose alone
// was holding up.
export const buildInitialState = (
  initialContact?: CheckoutInitialContact,
  savedAddresses?: SavedAddress[],
  demoCardEnabled = false,
): CheckoutState => {
  const list = savedAddresses ?? [];
  const seed = list.find((a) => a.isDefault) ?? list[0];
  return {
    ...EMPTY_INITIAL_STATE,
    // Default to the Card demo path when it's available so the portfolio demo
    // just works on first load. With the flag off (production posture), fall
    // back to Stripe — which matches what the selector actually shows since
    // the Card tile is hidden.
    paymentMethod: demoCardEnabled ? 'card' : 'stripe',
    contactName: initialContact?.name ?? '',
    contactEmail: initialContact?.email ?? '',
    contactPhone: initialContact?.phone ?? '',
    deliveryAddress: seed ? toDeliveryAddress(seed) : EMPTY_ADDRESS,
    savedAddresses: list,
  };
};

export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_FULFILLMENT':
      // The slot is deliberately kept when switching to delivery. Clearing it
      // silently moved a real booking: pick Saturday 4–5p, glance at the
      // delivery option, come back, and the auto-select in FulfillmentToggle
      // put you on the day's *first* window instead, with nothing saying so.
      // Nothing leaks either way — PlaceOrderButton only sends `pickupSlot`
      // when the order is actually a pickup.
      return { ...state, fulfillment: action.payload };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_PAYMENT_READY':
      return { ...state, isPaymentReady: action.payload };
    case 'SET_PROMO':
      return {
        ...state,
        promoCode: action.payload.code,
        promoDiscount: action.payload.amount,
        promoId: action.payload.promoId ?? '',
        promoExcludesPoints: action.payload.excludesPoints ?? false,
        promoExcludesMember: action.payload.excludesMember ?? false,
      };
    case 'SET_REDEMPTION':
      return { ...state, pointsToRedeem: action.payload.points, pointsDiscount: action.payload.dollars };
    case 'SET_CONTACT':
      return {
        ...state,
        contactName: action.payload.name,
        contactEmail: action.payload.email,
        contactPhone: action.payload.phone,
      };
    case 'SET_PICKUP_SLOT':
      return { ...state, pickupSlot: action.payload };
    case 'SET_DELIVERY_ADDRESS':
      // Any edit invalidates the previous radius answer. Without this, editing
      // a deliverable address into an undeliverable one leaves 'valid' on
      // state until the debounce catches up — and the submit gate would let
      // the order through in that window.
      return { ...state, deliveryAddress: action.payload, deliveryCheck: 'idle' };
    case 'SET_DELIVERY_CHECK':
      return { ...state, deliveryCheck: action.payload };
    case 'SET_ORDER_NOTES':
      return { ...state, orderNotes: action.payload };
    case 'SET_SAVE_CARD':
      // Unsetting "Save this card" also clears auto-settle since the
      // settlement step needs a saved card to charge against.
      return {
        ...state,
        saveCard: action.payload,
        ...(action.payload ? {} : { autoSettleAtPickup: false }),
      };
    case 'SET_AUTO_SETTLE_AT_PICKUP':
      return { ...state, autoSettleAtPickup: action.payload };
    case 'SET_CARD_DETAILS':
      return { ...state, cardDetails: action.payload };
    case 'SET_SELECTED_SAVED_CARD':
      // Picking a saved card forces the demo Card path and counts the form
      // as ready immediately (no need to retype). Clearing it (null) returns
      // control to the manual form's own ready-state effect.
      return {
        ...state,
        selectedSavedCardId: action.payload,
        ...(action.payload
          ? { paymentMethod: 'card' as const, isPaymentReady: true }
          : {}),
      };
    case 'PREFILL_FROM_PROPS': {
      // Used when the server-rendered prefill props change mid-session (e.g.
      // a guest signs in inline and the page re-renders with the user's
      // saved contact + addresses). Only fields that are still untouched get
      // seeded — anything the shopper has already typed is preserved.
      const { initialContact, savedAddresses: incomingAddresses } = action.payload;
      const list = incomingAddresses ?? [];
      const seed = list.find((a) => a.isDefault) ?? list[0];

      const contactName = state.contactName || (initialContact?.name ?? '');
      const contactEmail = state.contactEmail || (initialContact?.email ?? '');
      const contactPhone = state.contactPhone || (initialContact?.phone ?? '');

      const currentAddressIsEmpty =
        !state.deliveryAddress.address1 &&
        !state.deliveryAddress.address2 &&
        !state.deliveryAddress.city &&
        !state.deliveryAddress.state &&
        !state.deliveryAddress.zip;
      const deliveryAddress =
        currentAddressIsEmpty && seed
          ? toDeliveryAddress(seed)
          : state.deliveryAddress;

      return {
        ...state,
        contactName,
        contactEmail,
        contactPhone,
        deliveryAddress,
        // Always refresh the saved-addresses list itself — the picker has to
        // show what the freshly-signed-in user actually has on file.
        savedAddresses: list,
      };
    }
    default:
      return state;
  }
}

type CheckoutCtx = {
  state: CheckoutState;
  dispatch: Dispatch<CheckoutAction>;
};

const CheckoutContext = createContext<CheckoutCtx | null>(null);

type CheckoutProviderProps = {
  children: ReactNode;
  initialContact?: CheckoutInitialContact;
  savedAddresses?: SavedAddress[];
  // Resolved by the checkout server component from ENABLE_DEMO_CARD_TILE.
  // Drives the initial paymentMethod default so a guest landing on /checkout
  // with the flag off doesn't start with the hidden Card tile pre-selected.
  demoCardEnabled?: boolean;
};

export function CheckoutProvider({
  children,
  initialContact,
  savedAddresses,
  demoCardEnabled = false,
}: CheckoutProviderProps) {
  const [state, dispatch] = useReducer(
    checkoutReducer,
    buildInitialState(initialContact, savedAddresses, demoCardEnabled),
  );

  // When the server-rendered prefill props change after first mount (e.g. a
  // guest signs in inline and the page calls router.refresh()) we sync the
  // new values into state. The reducer's PREFILL_FROM_PROPS handler only
  // overwrites empty fields, so anything the shopper has already typed is
  // preserved across the transition.
  //
  // The key collapses the prefill props into one stable scalar so this reacts
  // to the user's identity actually changing, not to a parent re-render handing
  // back new object identities for the same data.
  const prefillKey =
    `${initialContact?.name ?? ''}|${initialContact?.email ?? ''}|${initialContact?.phone ?? ''}` +
    `::${(savedAddresses ?? []).map((a) => a.id).join(',')}`;

  // Adjusting state during render (React's recommended pattern over a mirroring
  // useEffect) rather than an effect keyed on the scalar. Seeding the comparison
  // state with the *current* key is what makes the first render a no-op:
  // buildInitialState already seeded the reducer from these same props, so a
  // first-render dispatch would be wasted work. That replaces the previous
  // isFirstPrefillRef guard — one less ref, and no dependency array to hold wrong.
  //
  // Same end state as the effect, slightly different timing: React replays this
  // component before committing, so the prefill lands pre-paint instead of after,
  // and there is no longer a frame showing un-prefilled fields. Dispatching during
  // render is only safe because PREFILL_FROM_PROPS is idempotent (it fills empty
  // fields only) — React may replay the render and enqueue the action twice. Keep
  // that reducer case idempotent or this pattern stops being safe.
  const [syncedPrefillKey, setSyncedPrefillKey] = useState(prefillKey);
  if (prefillKey !== syncedPrefillKey) {
    setSyncedPrefillKey(prefillKey);
    if (initialContact || (savedAddresses && savedAddresses.length > 0)) {
      dispatch({
        type: 'PREFILL_FROM_PROPS',
        payload: { initialContact, savedAddresses },
      });
    }
  }

  return (
    <CheckoutContext.Provider value={{ state, dispatch }}>
      {children}
    </CheckoutContext.Provider>
  );
};

export function useCheckoutContext(): CheckoutCtx {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckoutContext must be used within CheckoutProvider');
  return ctx;
}
