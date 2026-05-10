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

const EMPTY_ADDRESS: DeliveryAddress = { address1: '', address2: '', city: '', state: '', zip: '' };

export type CheckoutState = {
  isPaymentReady: boolean;
  fulfillment: Fulfillment;
  promoDiscount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pickupSlot: string;
  deliveryAddress: DeliveryAddress;
  orderNotes: string;
};

export type CheckoutAction =
  | { type: 'SET_FULFILLMENT'; payload: Fulfillment }
  | { type: 'SET_PAYMENT_READY'; payload: boolean }
  | { type: 'SET_PROMO'; payload: number }
  | { type: 'SET_CONTACT'; payload: { name: string; email: string; phone: string } }
  | { type: 'SET_PICKUP_SLOT'; payload: string }
  | { type: 'SET_DELIVERY_ADDRESS'; payload: DeliveryAddress }
  | { type: 'SET_ORDER_NOTES'; payload: string };

const initialState: CheckoutState = {
  isPaymentReady: false,
  fulfillment: 'pickup',
  promoDiscount: 0,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  pickupSlot: '',
  deliveryAddress: EMPTY_ADDRESS,
  orderNotes: '',
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
      return { ...state, promoDiscount: action.payload };
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

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

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
