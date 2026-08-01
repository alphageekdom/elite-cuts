'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useCartContext } from '@/context/CartContext';

const CheckoutGuard = ({ children }: { children: React.ReactNode }) => {
  const { cartItems, loading, loadError } = useCartContext();
  const router = useRouter();

  // A cart we failed to fetch is not an empty cart. Bouncing on `loadError`
  // threw a customer who was part-way through checkout onto the cart page for
  // one transient 500 — and the cart page then told them the cart was empty.
  // Staying put lets the retry recover them where they were.
  const isEmpty = !loading && !loadError && cartItems.length === 0;

  useEffect(() => {
    if (isEmpty) router.replace('/cart');
  }, [isEmpty, router]);

  if (isEmpty) return null;

  return <>{children}</>;
};

export default CheckoutGuard;
