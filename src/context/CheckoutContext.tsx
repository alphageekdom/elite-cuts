'use client';

import {
  createContext,
  useContext,
  useState,
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

type CheckoutCtx = {
  isPaymentReady: boolean;
  setIsPaymentReady: (v: boolean) => void;
  fulfillment: Fulfillment;
  setFulfillment: (v: Fulfillment) => void;
  promoDiscount: number;
  setPromoDiscount: (v: number) => void;
  contactName: string;
  setContactName: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  pickupSlot: string;
  setPickupSlot: (v: string) => void;
  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: (v: DeliveryAddress) => void;
  orderNotes: string;
  setOrderNotes: (v: string) => void;
};

const CheckoutContext = createContext<CheckoutCtx | null>(null);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [orderNotes, setOrderNotes] = useState('');

  return (
    <CheckoutContext.Provider
      value={{
        isPaymentReady,
        setIsPaymentReady,
        fulfillment,
        setFulfillment,
        promoDiscount,
        setPromoDiscount,
        contactName,
        setContactName,
        contactEmail,
        setContactEmail,
        contactPhone,
        setContactPhone,
        pickupSlot,
        setPickupSlot,
        deliveryAddress,
        setDeliveryAddress,
        orderNotes,
        setOrderNotes,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckoutContext = (): CheckoutCtx => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckoutContext must be used within CheckoutProvider');
  return ctx;
};
