'use client';

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

export type Fulfillment = 'pickup' | 'delivery';

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

export type CheckoutState = {
  isPaymentReady: boolean;
  fulfillment: Fulfillment;
  promoCode: string;
  promoDiscount: number;
  pointsToRedeem: number;
  pointsDiscount: number;        // dollar value of the redeemed points
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pickupSlot: string;
  deliveryAddress: DeliveryAddress;
  savedAddresses: SavedAddress[];
  orderNotes: string;
};

export type CheckoutAction =
  | { type: 'SET_FULFILLMENT'; payload: Fulfillment }
  | { type: 'SET_PAYMENT_READY'; payload: boolean }
  | { type: 'SET_PROMO'; payload: { code: string; amount: number } }
  | { type: 'SET_REDEMPTION'; payload: { points: number; dollars: number } }
  | { type: 'SET_CONTACT'; payload: { name: string; email: string; phone: string } }
  | { type: 'SET_PICKUP_SLOT'; payload: string }
  | { type: 'SET_DELIVERY_ADDRESS'; payload: DeliveryAddress }
  | { type: 'SET_ORDER_NOTES'; payload: string };

const EMPTY_INITIAL_STATE: CheckoutState = {
  isPaymentReady: false,
  fulfillment: 'pickup',
  promoCode: '',
  promoDiscount: 0,
  pointsToRedeem: 0,
  pointsDiscount: 0,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  pickupSlot: '',
  deliveryAddress: EMPTY_ADDRESS,
  savedAddresses: [],
  orderNotes: '',
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

const buildInitialState = (
  initialContact?: CheckoutInitialContact,
  savedAddresses?: SavedAddress[],
): CheckoutState => {
  const list = savedAddresses ?? [];
  const seed = list.find((a) => a.isDefault) ?? list[0];
  return {
    ...EMPTY_INITIAL_STATE,
    contactName: initialContact?.name ?? '',
    contactEmail: initialContact?.email ?? '',
    contactPhone: initialContact?.phone ?? '',
    deliveryAddress: seed ? toDeliveryAddress(seed) : EMPTY_ADDRESS,
    savedAddresses: list,
  };
};

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_FULFILLMENT':
      return {
        ...state,
        fulfillment: action.payload,
        ...(action.payload === 'delivery' ? { pickupSlot: '' } : {}),
      };
    case 'SET_PAYMENT_READY':
      return { ...state, isPaymentReady: action.payload };
    case 'SET_PROMO':
      return { ...state, promoCode: action.payload.code, promoDiscount: action.payload.amount };
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
      return { ...state, deliveryAddress: action.payload };
    case 'SET_ORDER_NOTES':
      return { ...state, orderNotes: action.payload };
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
};

export const CheckoutProvider = ({
  children,
  initialContact,
  savedAddresses,
}: CheckoutProviderProps) => {
  const [state, dispatch] = useReducer(
    checkoutReducer,
    buildInitialState(initialContact, savedAddresses),
  );

  return (
    <CheckoutContext.Provider value={{ state, dispatch }}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckoutContext = (): CheckoutCtx => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckoutContext must be used within CheckoutProvider');
  return ctx;
};
