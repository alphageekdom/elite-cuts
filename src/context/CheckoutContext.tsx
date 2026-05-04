'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type Fulfillment = 'pickup' | 'delivery';

type CheckoutCtx = {
  isPaymentReady: boolean;
  setIsPaymentReady: (v: boolean) => void;
  fulfillment: Fulfillment;
  setFulfillment: (v: Fulfillment) => void;
  promoDiscount: number;
  setPromoDiscount: (v: number) => void;
};

const CheckoutContext = createContext<CheckoutCtx | null>(null);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [promoDiscount, setPromoDiscount] = useState(0);
  return (
    <CheckoutContext.Provider
      value={{
        isPaymentReady,
        setIsPaymentReady,
        fulfillment,
        setFulfillment,
        promoDiscount,
        setPromoDiscount,
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
