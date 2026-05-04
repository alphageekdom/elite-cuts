'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useCartContext } from '@/context/CartContext';

const CheckoutGuard = ({ children }: { children: React.ReactNode }) => {
  const { cartItems, loading } = useCartContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && cartItems.length === 0) {
      router.replace('/cart');
    }
  }, [cartItems.length, loading, router]);

  if (!loading && cartItems.length === 0) return null;

  return <>{children}</>;
};

export default CheckoutGuard;
